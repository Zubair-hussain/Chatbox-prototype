import React from 'react';
import { View, Alert } from 'react-native';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { auth, db } from '../config/firebase';

const Account = () => {
  const onSignOut = () => {
    signOut(auth).catch((error) => {
      console.log('Error logging out: ', error);
      Alert.alert('Logout Failed', error.message);
    });
  };

  const deleteAccount = async () => {
    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('No user logged in.');

      // First delete user’s Firestore document
      if (user.email) {
        await deleteDoc(doc(db, 'users', user.email));
      }

      // Then delete Firebase Auth user
      await deleteUser(user);

      Alert.alert('Account deleted', 'Your account and data have been removed.');
    } catch (error) {
      console.log('Error deleting account: ', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      <Cell
        title="Blocked Users"
        icon="close-circle-outline"
        tintColor={colors.primary}
        onPress={() => {
          Alert.alert('Blocked users touched');
        }}
        style={{ marginTop: 20 }}
      />
      <Cell
        title="Logout"
        icon="log-out-outline"
        tintColor={colors.grey}
        onPress={() => {
          Alert.alert(
            'Logout?',
            'You will need to login again.',
            [
              { text: 'Logout', onPress: onSignOut },
              { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
          );
        }}
        showForwardIcon={false}
      />
      <Cell
        title="Delete my account"
        icon="trash-outline"
        tintColor={colors.red}
        onPress={() => {
          Alert.alert(
            'Delete account?',
            'Deleting your account will erase your message history.',
            [
              { text: 'Delete my account', onPress: deleteAccount, style: 'destructive' },
              { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
          );
        }}
        showForwardIcon={false}
        style={{ marginTop: 20 }}
      />
    </View>
  );
};

export default Account;
