import * as Updates from 'expo-updates';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

export function useOTAUpdates() {
    const {
        isUpdateAvailable,
        isUpdatePending,
        isDownloading,
        isChecking,
        checkError,
        downloadError,
    } = Updates.useUpdates();

    const handleReload = useCallback(async () => {
        try {
            await Updates.reloadAsync();
        } catch (e) {
            console.error('[OTA] Failed to reload:', e);
        }
    }, []);

    useEffect(() => {
        if (__DEV__) return; // Skip in development

        if (isUpdatePending) {
            Alert.alert(
                'Update Ready',
                'A new update has been downloaded. Restart now to apply it?',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Restart', onPress: handleReload },
                ],
                { cancelable: true }
            );
        }
    }, [isUpdatePending, handleReload]);

    useEffect(() => {
        if (__DEV__) return;

        if (checkError) {
            console.warn('[OTA] Check error:', checkError.message);
        }
        if (downloadError) {
            console.warn('[OTA] Download error:', downloadError.message);
        }
    }, [checkError, downloadError]);

    useEffect(() => {
        if (__DEV__) return;

        const checkForUpdates = async () => {
            try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    await Updates.fetchUpdateAsync();
                    Alert.alert(
                        'Update Ready',
                        'A new update has been downloaded. Restart now to apply it?',
                        [
                            { text: 'Later', style: 'cancel' },
                            { text: 'Restart', onPress: handleReload },
                        ],
                        { cancelable: true }
                    );
                }
            } catch (e) {
                console.error('[OTA] Error checking for updates:', e);
            }
        };

        // Check for updates 3 seconds after mount (give the app time to settle)
        const timeout = setTimeout(checkForUpdates, 3000);
        return () => clearTimeout(timeout);
    }, [handleReload]);

    return {
        isUpdateAvailable,
        isUpdatePending,
        isDownloading,
        isChecking,
        checkError,
        downloadError,
    };
}