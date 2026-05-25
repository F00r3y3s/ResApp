import { router } from 'expo-router';
import { ArrowLeft, LogOut, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';

import type { Circle, CircleMember, CircleRepository } from './circle-repository';

type Props = {
  circleId: string;
  repository: CircleRepository;
};

export function CircleDetailScreenContent({ circleId, repository }: Props) {
  const insets = useSafeAreaInsets();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [circles, currentMembers] = await Promise.all([
          repository.getMyCircles(),
          repository.getCircleMembers(circleId),
        ]);
        if (cancelled) return;
        const found = circles.find((c) => c.id === circleId) ?? null;
        setCircle(found);
        setMembers(currentMembers);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load circle.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [circleId, repository]);

  async function handleLeave() {
    if (isLeaving) return;
    setIsLeaving(true);
    setErrorMessage(null);
    try {
      await repository.leaveCircle(circleId);
      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not leave circle.');
    } finally {
      setIsLeaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={KitchenDesign.colors.ink} />
      </View>
    );
  }

  if (!circle) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <ArrowLeft size={20} stroke={KitchenDesign.colors.ink} />
          </Pressable>
          <Text style={styles.title}>Circle</Text>
          <View style={styles.iconButton} />
        </View>
        <Text style={styles.errorText}>We couldn&apos;t find that circle.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 24) }]}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={20} stroke={KitchenDesign.colors.ink} />
        </Pressable>
        <Text style={styles.title}>{circle.name}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Invite code</Text>
        <Text selectable style={styles.inviteCode}>
          {circle.inviteCode}
        </Text>
        <Text style={styles.inviteHelper}>
          Share this with family members. Anyone with the code can join this circle.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={18} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.sectionTitle}>Members</Text>
        </View>
        {members.length === 0 ? (
          <Text style={styles.helper}>No members yet.</Text>
        ) : (
          <View style={styles.memberList}>
            {members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {member.userId.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberCopy}>
                  <Text style={styles.memberId}>{member.userId}</Text>
                  <Text style={styles.memberJoined}>
                    Joined {member.joinedAt.slice(0, 10)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.roleBadge,
                    member.role === 'owner' ? styles.roleOwner : styles.roleMember,
                  ]}>
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Leave circle"
        onPress={handleLeave}
        disabled={isLeaving}
        style={({ pressed }) => [
          styles.leaveButton,
          isLeaving ? styles.disabled : null,
          pressed && !isLeaving ? styles.pressed : null,
        ]}>
        {isLeaving ? (
          <ActivityIndicator color={KitchenDesign.colors.danger} />
        ) : (
          <>
            <LogOut size={18} stroke={KitchenDesign.colors.danger} />
            <Text style={styles.leaveButtonText}>Leave circle</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: KitchenDesign.colors.ink, fontSize: 22, fontWeight: '900' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  inviteCard: {
    borderRadius: KitchenDesign.radius.card,
    padding: 18,
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  inviteLabel: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCode: {
    color: KitchenDesign.colors.ink,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  inviteHelper: { color: KitchenDesign.colors.muted, fontSize: 13, lineHeight: 19 },
  section: {
    borderRadius: KitchenDesign.radius.card,
    padding: 16,
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: KitchenDesign.colors.ink, fontSize: 17, fontWeight: '900' },
  helper: { color: KitchenDesign.colors.muted, fontSize: 14, lineHeight: 20 },
  memberList: { gap: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  memberInitial: { color: KitchenDesign.colors.ink, fontSize: 16, fontWeight: '900' },
  memberCopy: { flex: 1 },
  memberId: { color: KitchenDesign.colors.ink, fontSize: 14, fontWeight: '700' },
  memberJoined: { color: KitchenDesign.colors.muted, fontSize: 12 },
  roleBadge: {
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: KitchenDesign.radius.pill,
    overflow: 'hidden',
  },
  roleOwner: {
    color: KitchenDesign.colors.cream,
    backgroundColor: KitchenDesign.colors.orange,
  },
  roleMember: {
    color: KitchenDesign.colors.ink,
    backgroundColor: KitchenDesign.colors.linen,
  },
  leaveButton: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.danger,
    borderWidth: 1,
  },
  leaveButtonText: { color: KitchenDesign.colors.danger, fontSize: 16, fontWeight: '900' },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.5 },
});
