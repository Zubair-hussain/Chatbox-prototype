import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import {
  doc,
  query,
  where,
  setDoc,
  orderBy,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, db } from '../config/firebase';

const Users = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [existingChats, setExistingChats] = useState([]);

  useEffect(() => {
    // Fetch all users
    const usersRef = collection(db, 'users');
    const qUsers = query(usersRef, orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs);
    });

    // Fetch existing chats this user is in (via userEmails)
    const chatsRef = collection(db, 'chats');
    const qChats = query(chatsRef, where('userEmails', 'array-contains', auth?.currentUser?.email));
    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const existing = snapshot.docs.map((docSnap) => ({
        chatId: docSnap.id,
        users: docSnap.data().users || [],
        userEmails: docSnap.data().userEmails || [],
      }));
      setExistingChats(existing);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChats();
    };
  }, []);

  const handleNewGroup = useCallback(() => {
    navigation.navigate('Group');
  }, [navigation]);

  const handleNavigate = useCallback(
    async (user) => {
      const clickedEmail = user.data().email;
      const clickedName = user.data().name;

      // Message yourself
      if (clickedEmail === auth?.currentUser?.email) {
        // Look for a self chat (single userEmails with yourself)
        const selfChat = existingChats.find(
          (chat) => Array.isArray(chat.userEmails) && chat.userEmails.length === 1 && chat.userEmails[0] === clickedEmail
        );
        if (selfChat) {
          navigation.navigate('Chat', { id: selfChat.chatId, chatName: handleName(user) });
          return;
        }

        // Create self chat
        const newRef = doc(collection(db, 'chats'));
        await setDoc(newRef, {
          lastUpdated: serverTimestamp(),
          groupName: '',
          users: [{ email: clickedEmail, name: clickedName, deletedFromChat: false }],
          userEmails: [clickedEmail],
          lastAccess: [{ email: clickedEmail, date: serverTimestamp() }],
          messages: [],
        });
        navigation.navigate('Chat', { id: newRef.id, chatName: handleName(user) });
        return;
      }

      // 1-to-1 chat: reuse if it already exists
      const existing = existingChats.find(
        (chat) =>
          Array.isArray(chat.userEmails) &&
          chat.userEmails.includes(auth?.currentUser?.email) &&
          chat.userEmails.includes(clickedEmail) &&
          (chat.userEmails.length === 2) // ensure it's a direct chat
      );

      if (existing) {
        navigation.navigate('Chat', { id: existing.chatId, chatName: handleName(user) });
      } else {
        // Create a new direct chat
        const newRef = doc(collection(db, 'chats'));
        await setDoc(newRef, {
          lastUpdated: serverTimestamp(),
          groupName: '',
          users: [
            {
              email: auth?.currentUser?.email,
              name: auth?.currentUser?.displayName,
              deletedFromChat: false,
            },
            { email: clickedEmail, name: clickedName, deletedFromChat: false },
          ],
          userEmails: [auth?.currentUser?.email, clickedEmail],
          lastAccess: [
            { email: auth?.currentUser?.email, date: serverTimestamp() },
            { email: clickedEmail, date: '' },
          ],
          messages: [],
        });
        navigation.navigate('Chat', { id: newRef.id, chatName: handleName(user) });
      }
    },
    [existingChats, navigation]
  );

  const handleSubtitle = useCallback(
    (user) =>
      user.data().email === auth?.currentUser?.email
        ? 'Message yourself'
        : user.data().email,
    []
  );

  const handleName = useCallback((user) => {
    const { name, email } = user.data();
    if (name) {
      return email === auth?.currentUser?.email ? `${name} (You)` : name;
    }
    return email || '~ No Name ~';
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Cell
        title="New group"
        icon="people"
        tintColor={colors.teal}
        onPress={handleNewGroup}
        style={{ marginTop: 5 }}
      />

      {users.length === 0 ? (
        <View style={styles.blankContainer}>
          <Text style={styles.textContainer}>No registered users yet</Text>
        </View>
      ) : (
        <ScrollView>
          <View>
            <Text style={styles.textContainer}>Registered users</Text>
          </View>
          {users.map((user) => (
            <React.Fragment key={user.id}>
              <ContactRow
                name={handleName(user)}
                subtitle={handleSubtitle(user)}
                onPress={() => handleNavigate(user)}
                showForwardIcon={false}
              />
            </React.Fragment>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  blankContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  textContainer: {
    fontSize: 16,
    fontWeight: '300',
    marginLeft: 16,
  },
});

export default Users;
