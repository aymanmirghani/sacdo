import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';

// Required: handle FCM messages when the app is in the background or killed
messaging().setBackgroundMessageHandler(async () => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
