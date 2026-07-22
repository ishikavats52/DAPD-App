import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/main/HomeScreen';
import CameraScreen from '../screens/main/CameraScreen';
import VerificationScreen from '../screens/main/VerificationScreen';

import AddArticleScreen from '../screens/main/AddArticleScreen';

export type MainStackParamList = {
  Home: undefined;
  AddArticle: undefined;
  Scanner: undefined;
  Verification: { extractedData: any; imageUris: string[]; isEditMode?: boolean; editId?: string };
  MedicineDetail: { id: string };
  Search: undefined;
  Profile: undefined;
  Users: undefined;
  AddEmployee: undefined;
  AuditLog: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainTabNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddArticle" component={AddArticleScreen} />
      <Stack.Screen name="Scanner" component={CameraScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="Search" component={require('../screens/main/SearchScreen').default} />
      <Stack.Screen name="MedicineDetail" component={require('../screens/main/MedicineDetailScreen').default} />
      <Stack.Screen name="Profile" component={require('../screens/main/ProfileScreen').default} />
      <Stack.Screen name="Users" component={require('../screens/main/UsersScreen').default} />
      <Stack.Screen name="AddEmployee" component={require('../screens/main/AddEmployeeScreen').default} />
      <Stack.Screen name="AuditLog" component={require('../screens/main/AuditLogScreen').default} />
    </Stack.Navigator>
  );
};
