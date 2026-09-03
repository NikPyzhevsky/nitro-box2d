import { StatusBar } from 'expo-status-bar'
import { box2d } from 'nitro-box2d'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import { PinballScreen } from './src/pinball/PinballScreen'
import { PlaygroundScreen } from './src/playground/PlaygroundScreen'

const TABS = [
  { key: 'playground', label: 'Playground' },
  { key: 'pinball', label: 'Pinball' },
] as const

type TabKey = (typeof TABS)[number]['key']

function Shell() {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()

  const [tab, setTab] = useState<TabKey>('playground')
  const [stats, setStats] = useState<Record<TabKey, string>>({ playground: '', pinball: '' })

  const stageHeight = height - insets.top - insets.bottom - 196

  const onPlaygroundStats = useCallback(
    (value: string) => setStats((current) => ({ ...current, playground: value })),
    []
  )
  const onPinballStats = useCallback(
    (value: string) => setStats((current) => ({ ...current, pinball: value })),
    []
  )

  const version = useMemo(() => box2d.version, [])

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>nitro-box2d</Text>
        <Text style={styles.subtitle}>
          Box2D {version}
          {stats[tab] === '' ? '' : ` · ${stats[tab]}`}
        </Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((entry) => (
          <Pressable
            key={entry.key}
            testID={`tab-${entry.key}`}
            onPress={() => setTab(entry.key)}
            style={[styles.tab, tab === entry.key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, tab === entry.key && styles.tabLabelActive]}>
              {entry.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/*
        Both screens stay mounted so switching tabs does not throw away a game in
        progress — each holds its own world, and only the visible one steps it.
        An unstepped world costs nothing but the memory it already had.
      */}
      <View style={[styles.screen, tab !== 'playground' && styles.hidden]}>
        <PlaygroundScreen
          active={tab === 'playground'}
          width={width}
          height={stageHeight}
          onStats={onPlaygroundStats}
        />
      </View>
      <View style={[styles.screen, tab !== 'pinball' && styles.hidden]}>
        <PinballScreen
          active={tab === 'pinball'}
          width={width}
          height={stageHeight}
          onStats={onPinballStats}
        />
      </View>

      <StatusBar style="light" />
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#11131a',
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    color: '#f5f6fa',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8b93a7',
    fontSize: 13,
    marginTop: 2,
  },
  tabs: {
    backgroundColor: '#1a1d27',
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 20,
    padding: 3,
  },
  tab: {
    borderRadius: 8,
    flex: 1,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: '#2f3648',
  },
  tabLabel: {
    color: '#8b93a7',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#f5f6fa',
  },
  screen: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
})
