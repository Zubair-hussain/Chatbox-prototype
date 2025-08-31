import PropTypes from 'prop-types';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import EmojiModal from 'react-native-emoji-modal';
import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Send, Bubble, GiftedChat, InputToolbar } from 'react-native-gifted-chat';
import { ref, getStorage, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import {
  View,
  Keyboard,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { colors } from '../config/constants';
import { auth, db } from '../config/firebase';

const RenderLoadingUpload = () => (
  <View style={styles.loadingContainerUpload}>
    <ActivityIndicator size="large" color={colors.teal} />
  </View>
);

const RenderLoading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.teal} />
  </View>
);

const RenderBubble = (props) => (
  <Bubble
    {...props}
    wrapperStyle={{
      right: { backgroundColor: colors.primary },
      left: { backgroundColor: 'lightgrey' },
    }}
  />
);

const RenderInputToolbar = (props, handleEmojiPanel, pickImage) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      backgroundColor: 'white',
    }}
  >
    <InputToolbar
      {...props}
      renderActions={() => (
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.iconButton} onPress={handleEmojiPanel}>
            <Ionicons name="happy-outline" size={28} color={colors.teal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
            <Ionicons name="attach-outline" size={28} color={colors.teal} />
          </TouchableOpacity>
        </View>
      )}
      containerStyle={styles.inputToolbar}
    />
    <Send {...props}>
      <View style={styles.sendIconContainer}>
        <Ionicons name="send" size={22} color={colors.teal} />
      </View>
    </Send>
  </View>
);

function Chat({ route }) {
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const chatRef = doc(db, 'chats', route.params.id);

    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.messages) {
        setMessages(
          data.messages.map((message) => ({
            ...message,
            createdAt: message?.createdAt?.toDate?.() || new Date(),
            image: message.image ?? '',
          }))
        );
      } else {
        setMessages([]);
      }
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      if (modal) {
        setModal(false);
        return true;
      }
      return false;
    });

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      if (modal) setModal(false);
    });

    return () => {
      unsubscribe();
      backHandler.remove();
      keyboardDidShowListener.remove();
    };
  }, [route.params.id, modal]);

  const onSend = useCallback(
    async (m = []) => {
      try {
        const chatDocRef = doc(db, 'chats', route.params.id);
        const chatDocSnap = await getDoc(chatDocRef);
        const chatData = chatDocSnap.data();

        const existingMessages =
          chatData?.messages?.map((message) => ({
            ...message,
            createdAt: message?.createdAt?.toDate?.() || new Date(),
            image: message.image ?? '',
          })) || [];

        const toSend = {
          ...m[0],
          sent: true,
          received: false,
          createdAt: serverTimestamp(),
        };

        const chatMessages = GiftedChat.append(existingMessages, [toSend]);

        await setDoc(
          chatDocRef,
          {
            messages: chatMessages,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error sending message: ', error);
        Alert.alert('Error', 'Could not send message.');
      }
    },
    [route.params.id]
  );

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        await uploadImageAsync(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image Picker Error: ', error);
    }
  };

  const uploadImageAsync = async (uri) => {
    setUploading(true);
    try {
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      const randomString = uuid.v4();
      const fileRef = ref(getStorage(), `images/${randomString}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error('Upload error: ', error);
          Alert.alert('Error', 'Image upload failed.');
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          blob.close?.();
          setUploading(false);
          onSend([
            {
              _id: randomString,
              createdAt: new Date(),
              text: '',
              image: downloadUrl,
              user: {
                _id: auth?.currentUser?.email,
                name: auth?.currentUser?.displayName,
                avatar: 'https://i.pravatar.cc/300',
              },
            },
          ]);
        }
      );
    } catch (error) {
      console.error('Upload Exception: ', error);
      setUploading(false);
    }
  };

  const handleEmojiPanel = useCallback(() => {
    setModal((prevModal) => !prevModal);
    Keyboard.dismiss();
  }, []);

  return (
    <>
      {uploading && RenderLoadingUpload()}
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={false}
        showUserAvatar={false}
        onSend={(messagesArr) => onSend(messagesArr)}
        imageStyle={{ height: 212, width: 212 }}
        messagesContainerStyle={{ backgroundColor: '#fff' }}
        textInputStyle={{ backgroundColor: '#fff', borderRadius: 20 }}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: 'https://i.pravatar.cc/300',
        }}
        renderBubble={RenderBubble}
        renderInputToolbar={(props) =>
          RenderInputToolbar(props, handleEmojiPanel, pickImage)
        }
        minInputToolbarHeight={56}
        scrollToBottom
        scrollToBottomStyle={styles.scrollToBottomStyle}
        renderLoading={RenderLoading}
      />

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={styles.emojiModal}
          containerStyle={styles.emojiContainerModal}
          backgroundStyle={styles.emojiBackgroundModal}
          columns={5}
          emojiSize={66}
          activeShortcutColor={colors.primary}
          onEmojiSelected={(emoji) => {
            onSend([
              {
                _id: uuid.v4(),
                createdAt: new Date(),
                text: emoji,
                user: {
                  _id: auth?.currentUser?.email,
                  name: auth?.currentUser?.displayName,
                  avatar: 'https://i.pravatar.cc/300',
                },
              },
            ]);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    borderRadius: 16,
    bottom: 8,
    height: 32,
    marginLeft: 4,
    width: 32,
  },
  emojiBackgroundModal: {},
  emojiContainerModal: {
    height: 348,
    width: 396,
  },
  emojiModal: {},
  inputToolbar: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: colors.grey,
    borderRadius: 22,
    borderWidth: 0.5,
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainerUpload: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
  scrollToBottomStyle: {
    borderColor: colors.grey,
    borderRadius: 28,
    borderWidth: 1,
    bottom: 12,
    height: 56,
    position: 'absolute',
    right: 12,
    width: 56,
  },
  sendIconContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: colors.grey,
    borderRadius: 22,
    borderWidth: 0.5,
    height: 44,
    justifyContent: 'center',
    marginRight: 8,
    width: 44,
  },
});

Chat.propTypes = {
  route: PropTypes.object.isRequired,
};

export default Chat;
