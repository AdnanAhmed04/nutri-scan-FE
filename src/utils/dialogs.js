/**
 * Cross-platform dialogs.
 * React Native's Alert.alert ignores buttons on web (react-native-web), so
 * confirmations there fall back to the browser's confirm/alert.
 */
import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Resolves true if the user confirmed, false otherwise
export const confirmAction = ({ title, message, confirmText = 'OK', destructive = false }) =>
  new Promise((resolve) => {
    if (isWeb) {
      resolve(window.confirm(message ? `${title}\n\n${message}` : title));
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });

export const showMessage = (title, message) => {
  if (isWeb) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
};
