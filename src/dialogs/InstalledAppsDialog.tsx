import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../theme';
import type { AppController } from '../useAppController';
import { Button } from '../components';
import { LIMITS } from '../model';
import { nativeUnavailableMessage } from '../native';
import { InstalledAppIcon } from '../InstalledAppIcon';
export function InstalledAppsDialog({ controller }: { controller: AppController }) {
  const { s, C } = useTheme();
  const {
    config,
    status,
    update,
    installed,
    search,
    setSearch,
    closeAfter,
    saving,
    appsLoading,
    appsError,
    loadInstalledApps,
  } = controller;
  const query = search.trim().toLocaleLowerCase();
  const [limit, setLimit] = useState(40);
  const matches = installed.filter(
    (a) =>
      (a.name.toLocaleLowerCase().includes(query) || a.packageName.toLowerCase().includes(query)) &&
      !config.apps.some((r) => r.packageName === a.packageName),
  );
  if (!status.available)
    return (
      <>
        <Text style={s.modalTitle}>App selection is unavailable.</Text>
        <Text accessibilityRole="alert" style={s.body}>
          {nativeUnavailableMessage}
        </Text>
      </>
    );
  return (
    <>
      <Text style={s.modalTitle}>A stronger boundary.</Text>
      <Text style={s.body}>
        Find an installed app, then tap its Add button for whole-app blocking.
      </Text>
      <TextInput
        accessibilityLabel="Search installed apps"
        placeholder="Search apps"
        style={[s.input, { marginTop: 16 }]}
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setLimit(40);
        }}
        placeholderTextColor={C.muted}
        autoCorrect={false}
        autoCapitalize="none"
        editable={!appsLoading && !saving}
      />
      {appsLoading && (
        <ActivityIndicator
          accessibilityLabel="Loading installed apps"
          color={C.dark}
          style={{ marginTop: 20 }}
        />
      )}
      {appsError && (
        <>
          <Text accessibilityRole="alert" style={s.inlineError}>
            {appsError}
          </Text>
          <Button title="Try again" secondary onPress={() => void loadInstalledApps()} />
        </>
      )}
      {!appsLoading && !appsError && matches.length === 0 && (
        <Text style={s.hint}>
          {query
            ? 'No new apps match this search. Try another name. Apps already on your Apps screen are not listed here.'
            : 'No additional apps found in this Android profile. Apps already on your Apps screen are not listed here.'}
        </Text>
      )}
      {config.apps.length >= LIMITS.apps && (
        <Text style={s.hint}>You have reached the {LIMITS.apps}-app limit.</Text>
      )}
      {!appsLoading &&
        !appsError &&
        matches.slice(0, limit).map((a) => (
          <Pressable
            key={a.packageName}
            accessibilityRole="button"
            accessibilityLabel={`Add ${a.name} to blocked apps`}
            disabled={saving || config.apps.length >= LIMITS.apps}
            onPress={() =>
              void update((c) => ({
                ...c,
                apps: c.apps.some((r) => r.packageName === a.packageName)
                  ? c.apps
                  : [...c.apps, { ...a, id: a.packageName, mode: 'full' }],
              })).then(closeAfter)
            }
            style={s.appRow}
          >
            <InstalledAppIcon packageName={a.packageName} />
            <Text style={[s.cardTitle, { flex: 1 }]}>{a.name}</Text>
            <Plus size={18} color={C.dark} />
            <Text style={s.cardTitle}>Add</Text>
          </Pressable>
        ))}
      {matches.length > limit && (
        <Button title="Show more apps" secondary onPress={() => setLimit((value) => value + 40)} />
      )}
    </>
  );
}
