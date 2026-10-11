import React from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Plus, Smartphone } from 'lucide-react-native';
import { s, C } from '../styles';
import type { AppController } from '../useAppController';
export function InstalledAppsDialog({ controller }: { controller: AppController }) {
  const { config, status, update, installed, search, setSearch, closeAfter } = controller;
  return (
    <>
      <Text style={s.modalTitle}>A stronger boundary.</Text>
      <Text style={s.body}>Add an installed app for whole-app blocking.</Text>
      <TextInput
        accessibilityLabel="Search installed apps"
        placeholder="Search apps"
        style={[s.input, { marginTop: 16 }]}
        value={search}
        onChangeText={setSearch}
      />
      {!status.available && (
        <Text style={s.hint}>Installed apps require a native Android build.</Text>
      )}
      {installed
        .filter(
          (a) =>
            a.name.toLowerCase().includes(search.toLowerCase()) &&
            !config.apps.some((r) => r.packageName === a.packageName),
        )
        .map((a) => (
          <Pressable
            key={a.packageName}
            accessibilityRole="button"
            onPress={() =>
              void update((c) => ({
                ...c,
                apps: [...c.apps, { ...a, id: a.packageName, mode: 'full' }],
              })).then(closeAfter)
            }
            style={s.appRow}
          >
            <Smartphone size={22} color={C.dark} />
            <Text style={[s.cardTitle, { flex: 1 }]}>{a.name}</Text>
            <Plus size={18} color={C.dark} />
          </Pressable>
        ))}
    </>
  );
}
