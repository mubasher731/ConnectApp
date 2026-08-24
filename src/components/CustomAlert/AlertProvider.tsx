import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { CustomAlert } from './CustomAlert';
import type { AlertAction, CustomAlertOptions } from './CustomAlert';

interface AlertContextValue {
  showAlert: (options: CustomAlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

/**
 * Provides a global `showAlert(...)` that renders the shared CustomAlert modal.
 * Wrap the app (or navigator) with <AlertProvider> so every screen can use it.
 */
export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<CustomAlertOptions | null>(null);

  const showAlert = useCallback((opts: CustomAlertOptions) => {
    setOptions(opts);
  }, []);

  const hideAlert = useCallback(() => {
    setOptions(null);
  }, []);

  const handleAction = useCallback(
    (action: AlertAction) => {
      hideAlert();
      action.onPress?.();
    },
    [hideAlert]
  );

  const defaultActions: AlertAction[] = [{ text: 'OK', onPress: hideAlert }];
  const actions = options?.actions ?? defaultActions;

  const actionHandlers = useMemo(
    () =>
      actions.map((action) => ({
        ...action,
        onPress: () => handleAction(action),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, handleAction]
  );

  const value = useMemo(() => ({ showAlert, hideAlert }), [showAlert, hideAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={options !== null}
        title={options?.title}
        message={options?.message}
        icon={options?.icon}
        actions={actionHandlers}
        dismissable={options?.dismissable}
        onDismiss={hideAlert}
      />
    </AlertContext.Provider>
  );
};

/** Access showAlert/hideAlert from any screen under <AlertProvider>. */
export const useAlert = (): AlertContextValue => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export default AlertProvider;
