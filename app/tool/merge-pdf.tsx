import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Button } from '@/components/ui/Button';
import { mergePDFs } from '@/src/services/pdfService';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

export default function MergePDFScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<{ name: string; uri: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
    });
    if (!result.canceled && result.assets) {
      setFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({ name: a.name, uri: a.uri })),
      ]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setOutputUri(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      Alert.alert('Error', 'Please select at least 2 PDF files.');
      return;
    }
    setProcessing(true);
    try {
      const uri = await mergePDFs(files.map((f) => f.uri));
      setOutputUri(uri);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to merge PDFs');
    } finally {
      setProcessing(false);
    }
  };

  const share = async () => {
    if (outputUri) {
      await Sharing.shareAsync(outputUri);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-950"
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Merge PDF
      </Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mb-6">
        Combine multiple PDF files into a single document. Drag to reorder.
      </Text>

      {/* File Picker */}
      <Button onPress={pickFiles} variant="outline" icon={<HugeIcon name="merge" size={18} color="#2563eb" />}>
        Add PDF Files
      </Button>

      {/* File List */}
      {files.length > 0 && (
        <View className="mt-4 gap-2">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </Text>
          {files.map((f, i) => (
            <View
              key={i}
              className="flex-row items-center bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3"
            >
              <View className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg items-center justify-center mr-3">
                <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {i + 1}
                </Text>
              </View>
              <Text
                className="flex-1 text-base text-gray-900 dark:text-white"
                numberOfLines={1}
              >
                {f.name}
              </Text>
              <Pressable onPress={() => removeFile(i)} className="p-2">
                <HugeIcon name="search" size={16} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Merge Button */}
      {files.length >= 2 && (
        <View className="mt-6">
          <Button onPress={handleMerge} loading={processing}>
            Merge {files.length} Files
          </Button>
        </View>
      )}

      {/* Processing */}
      {processing && (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-500 dark:text-gray-400 mt-4">
            Merging PDF files...
          </Text>
        </View>
      )}

      {/* Result */}
      {outputUri && (
        <View className="mt-6 bg-green-50 dark:bg-green-900/30 rounded-2xl p-5">
          <View className="flex-row items-center mb-3">
            <HugeIcon name="merge" size={24} color="#22c55e" />
            <Text className="ml-2 text-lg font-bold text-green-700 dark:text-green-400">
              Merge Complete!
            </Text>
          </View>
          <Button onPress={share} size="sm">
            Share Merged PDF
          </Button>
        </View>
      )}
    </ScrollView>
  );
}