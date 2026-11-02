import { Href, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { DEV_ROUTE } from '../dev/route';
import { loadProfile } from '../lib/profile';
import { C } from '../theme';

function devRoute(): string | null {
  return __DEV__ && DEV_ROUTE ? DEV_ROUTE : null;
}

export default function Index() {
  const [dest, setDest] = useState<string | null>(null);
  useEffect(() => {
    const dev = devRoute();
    if (dev) return setDest(dev);
    loadProfile().then((p) => setDest(p ? '/home' : '/onboarding'));
  }, []);
  if (!dest) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  const [pathname, query = ''] = dest.split('?');
  const params = Object.fromEntries(new URLSearchParams(query).entries());
  return <Redirect href={{ pathname, params } as Href} />;
}
