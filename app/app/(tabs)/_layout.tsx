import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, active: IoniconsName, inactive: IoniconsName) {
  return <Ionicons name={focused ? active : inactive} size={24} color={focused ? Colors.primary : Colors.textMuted} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.background,
          paddingBottom: 4,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarLabel: 'Início',
          tabBarIcon: ({ focused }) => icon(focused, 'home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="nova-corrida"
        options={{
          title: 'Corrida',
          tabBarLabel: 'Corrida',
          tabBarIcon: ({ focused }) => icon(focused, 'car', 'car-outline'),
        }}
      />
      <Tabs.Screen
        name="abastecimento"
        options={{
          title: 'Combustível',
          tabBarLabel: 'Combustível',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="gas-station-outline"
              size={24}
              color={focused ? Colors.primary : Colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarLabel: 'Relatórios',
          tabBarIcon: ({ focused }) => icon(focused, 'stats-chart', 'stats-chart-outline'),
        }}
      />
    </Tabs>
  );
}
