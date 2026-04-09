import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, active: IoniconsName, inactive: IoniconsName) {
  return <Ionicons name={focused ? active : inactive} size={24} color={focused ? Colors.primary : Colors.textMuted} />;
}

function iconCombustivel({ focused }: Readonly<{ focused: boolean }>) {
  return (
    <MaterialCommunityIcons
      name="gas-station-outline"
      size={24}
      color={focused ? Colors.primary : Colors.textMuted}
    />
  );
}

function iconInicio({ focused }: Readonly<{ focused: boolean }>) {
  return icon(focused, 'home', 'home-outline');
}
function iconCorrida({ focused }: Readonly<{ focused: boolean }>) {
  return icon(focused, 'car', 'car-outline');
}
function iconRelatorios({ focused }: Readonly<{ focused: boolean }>) {
  return icon(focused, 'stats-chart', 'stats-chart-outline');
}
function iconRegistros({ focused }: Readonly<{ focused: boolean }>) {
  return icon(focused, 'list', 'list-outline');
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
          tabBarIcon: iconInicio,
        }}
      />
      <Tabs.Screen
        name="nova-corrida"
        options={{
          title: 'Corrida',
          tabBarLabel: 'Corrida',
          tabBarIcon: iconCorrida,
        }}
      />
      <Tabs.Screen
        name="abastecimento"
        options={{
          title: 'Combustível',
          tabBarLabel: 'Combustível',
          tabBarIcon: iconCombustivel,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarLabel: 'Relatórios',
          tabBarIcon: iconRelatorios,
        }}
      />
      <Tabs.Screen
        name="registros"
        options={{
          title: 'Registros',
          tabBarLabel: 'Registros',
          tabBarIcon: iconRegistros,
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="metas"
        options={{ href: null }}
      />
    </Tabs>
  );
}
