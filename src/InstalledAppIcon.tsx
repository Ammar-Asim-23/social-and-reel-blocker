import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { bridge } from './native';
import { useTheme } from './theme';

/** Icons come from Android's package manager; no network or persistent app inventory. */
export function InstalledAppIcon({ packageName }: { packageName: string }) {
  const { s, C } = useTheme();
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUri(null);
    void bridge
      .appIcon(packageName)
      .then((value) => {
        if (active) setUri(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [packageName]);
  return (
    <View style={s.appIcon} accessible={false}>
      {uri ? (
        <Image source={{ uri }} style={{ width: 36, height: 36 }} onError={() => setUri(null)} />
      ) : (
        <Smartphone size={23} color={C.ink} />
      )}
    </View>
  );
}
