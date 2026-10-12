import React from 'react';
import { Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button } from '../components';
import type { AppController } from '../useAppController';
export function ResetDialog({ controller }: { controller: AppController }) {
  const { s, C } = useTheme();
  const { p, setTab, setSheet, run } = controller;
  return (
    <>
      <Trash2 size={32} color={C.dark} />
      <Text style={s.modalTitle}>A fresh start?</Text>
      <Text style={s.body}>
        Stop protection and delete rules, routines, app selections, and local usage. System
        permissions stay in Settings.
      </Text>
      <View style={{ marginTop: 24 }}>
        <Button
          title="Reset and stop protection"
          onPress={() =>
            void run(async () => {
              await p.reset();
              setSheet(null);
              setTab('Today');
            })
          }
        />
      </View>
    </>
  );
}
