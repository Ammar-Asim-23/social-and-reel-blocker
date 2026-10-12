import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme';
import { Button } from '../components';
import { fullDays } from '../constants';
import type { AppController } from '../useAppController';
export function ScheduleDialog({ controller }: { controller: AppController }) {
  const { s, C } = useTheme();
  const {
    update,
    saving,
    editing,
    name,
    setName,
    start,
    setStart,
    end,
    setEnd,
    days,
    setDays,
    closeAfter,
    saveSchedule,
  } = controller;
  return (
    <>
      <Text style={s.modalTitle}>{editing ? 'Your routine.' : 'Make room, every week.'}</Text>
      <Text style={s.fieldLabel}>NAME</Text>
      <TextInput
        accessibilityLabel="Routine name"
        value={name}
        onChangeText={setName}
        maxLength={40}
        style={s.input}
      />
      <View style={s.timeRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>START · 24-HOUR</Text>
          <TextInput
            accessibilityLabel="Start time"
            value={start}
            onChangeText={setStart}
            maxLength={5}
            style={s.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>END · 24-HOUR</Text>
          <TextInput
            accessibilityLabel="End time"
            value={end}
            onChangeText={setEnd}
            maxLength={5}
            style={s.input}
          />
        </View>
      </View>
      <Text style={s.fieldLabel}>REPEAT ON</Text>
      <View style={s.daysRow}>
        {fullDays.map((d, i) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: days.includes(i) }}
            accessibilityLabel={d}
            key={i}
            onPress={() =>
              setDays((ds) => (ds.includes(i) ? ds.filter((n) => n !== i) : [...ds, i].sort()))
            }
            style={[s.day, days.includes(i) && { backgroundColor: C.green }]}
          >
            <Text style={s.cardTitle}>{d[0]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.hint}>At least 15 minutes. Overnight routines end the next day.</Text>
      <Button title="Save routine" disabled={saving} onPress={() => void saveSchedule()} />
      {editing && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="Delete routine"
            secondary
            onPress={() =>
              void update((c) => ({
                ...c,
                schedules: c.schedules.filter((s) => s.id !== editing.id),
              })).then(closeAfter)
            }
          />
        </View>
      )}
    </>
  );
}
