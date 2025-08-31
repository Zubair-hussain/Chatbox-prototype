// src/screens/ChatInfo.js
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { db } from '../config/firebase';

const ChatInfo = ({ route }) => {
  const { chatId, chatName } = route.params;
  const [users, setUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          if (chatData) {
            setUsers(Array.isArray(chatData.users) ? chatData.users : []);
            setGroupName(chatData.groupName || '');
          } else {
            setUsers([]);
          }
        } else {
          Alert.alert('Error', 'Chat does not exist');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching chat info');
        console.error('Error fetching chat info: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatInfo();
  }, [chatId]);

  // ✅ Avoid duplicate users (based on email)
  const uniqueUsers = Array.from(
    new Map(users.map((user) => [user.email, user])).values()
  );

  const renderUser = ({ item }) => (
    <View style={styles.userContainer}>
      <Ionicons name="person-outline" size={30} color={colors.primary} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item?.name || 'Unknown User'}</Text>
        <Text style={styles.userEmail}>{item?.email || 'No Email'}</Text>
      </View>
    </View>
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.avatar}>
        <View>
          <Text style={styles.avatarLabel}>
            {getInitials(chatName)}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.chatHeader}>
        {groupName ? (
          <>
            <Text style={styles.groupLabel}>Group</Text>
            <Text style={styles.chatTitle}>{groupName}</Text>
          </>
        ) : (
          <Text style={styles.chatTitle}>{chatName}</Text>
        )}
      </View>

      <Cell
        title="About"
        subtitle="Available"
        icon="information-circle-outline"
        iconColor={colors.primary}
        style={styles.cell}
      />

      <Text style={styles.usersTitle}>Members</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={uniqueUsers}
          renderItem={renderUser}
          keyExtractor={(item, index) => item?.email || `user-${index}`}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>
              No members found.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

ChatInfo.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      chatId: PropTypes.string.isRequired,
      chatName: PropTypes.string.isRequired,
    }),
  }).isRequired,
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 60,
    height: 120,
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 20,
    width: 120,
  },
  avatarLabel: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  cell: {
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 0.5,
    marginBottom: 15,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chatHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chatTitle: {
    color: '#333',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {   // ✅ moved before "groupLabel"
    backgroundColor: '#f9f9f9',
    flex: 1,
  },
  groupLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userEmail: {
    color: '#666',
    fontSize: 14,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  usersList: {
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 0.5,
    marginHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  usersTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 20,
  },
});


export default ChatInfo;
