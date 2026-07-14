import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '../theme';

type Props = {
  compact?: boolean;
};

const DAPDHeader = ({ compact = false }: Props) => {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Image
        source={require('../../assets/emblem.png')}
        style={compact ? styles.emblemCompact : styles.emblem}
        resizeMode="contain"
      />
      
      {!compact && (
        <View style={styles.textContainer}>
          <Text style={styles.ministryText}>MINISTRY OF DEFENCE</Text>
          <Text style={styles.dapdText}>D A P D</Text>
          <Text style={styles.subtitleText}>Defence Articles Pricing Depository</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
  compactContainer: {
    marginVertical: 0,
    alignItems: 'flex-start',
    padding: 8,
  },
  emblem: {
    width: 200,
    height: 290,
    marginBottom: 0,
  },
  emblemCompact: {
    width: 40,
    height: 60,
  },
  textContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
    paddingTop: 16,
    width: '80%',
  },
  ministryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  dapdText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 8,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default DAPDHeader;
