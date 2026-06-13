import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { compressPDF } from '@/src/services/pdfService';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

export default function CompressPDFScreen() {
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setOutputUri(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const uri = await compressPDF(file.uri);
      setOutputUri(uri);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Compression failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-950" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Compress PDF</Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mb-6">Reduce file size while maintaining quality.</Text>

      <Button onPress={pickFile} variant="outline">Select PDF File</Button>

      {file && (
        <View className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">{file.name}</Text>
          <Button onPress={handleCompress} loading={processing} size="sm" style={{ marginTop: 12 }}>
            Compress Now
          </Button>
        </View>
      )}

      {processing && (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-500 mt-4">Compressing...</Text>
        </View>
      )}

      {outputUri && (
        <View className="mt-6 bg-green-50 dark:bg-green-900/30 rounded-2xl p-5">
          <Text className="text-lg font-bold text-green-700 dark:text-green-400 mb-3">Compression Complete!</Text>
          <Button onPress={() => Sharing.shareAsync(outputUri)} size="sm">Share Compressed PDF</Button>
        </View>
      )}
    </ScrollView>
  );
}