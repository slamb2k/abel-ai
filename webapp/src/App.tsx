// Copyright (c) Microsoft. All rights reserved.

import { AuthenticatedTemplate, UnauthenticatedTemplate, useIsAuthenticated, useMsal } from '@azure/msal-react';
import { FluentProvider, Image, makeStyles, shorthands, tokens } from '@fluentui/react-components';

import * as React from 'react';
import { FC, useEffect } from 'react';
import { LogoSection } from './components/header/LogoSection';
import { UserSettingsMenu } from './components/header/UserSettingsMenu';
import { PluginGallery } from './components/open-api-plugins/PluginGallery';
import { BackendProbe, ChatView, Error, Loading, Login } from './components/views';
import { AuthHelper } from './libs/auth/AuthHelper';
import { useChat, useFile } from './libs/hooks';
import { useAppDispatch, useAppSelector } from './redux/app/hooks';
import { RootState } from './redux/app/store';
import { FeatureKeys } from './redux/features/app/AppState';
import { setActiveUserInfo, setServiceOptions } from './redux/features/app/appSlice';
import { semanticKernelDarkTheme, semanticKernelLightTheme } from './styles';

import abelLogo from './assets/abel-type-logo.png';

export const useClasses = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
        width: '100%',
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',        
        alignItems: 'center',
        backgroundColor: '#005D9F',
        color: tokens.colorNeutralForegroundOnBrand,
        height: '100%',
        width: '100%',        
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',        
        alignContent: 'flex-start',
        height: '100%',
        flexWrap: 'nowrap',
        ...shorthands.gap(tokens.spacingVerticalL),
    },
    headerRight: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignContent: 'right',
        flexWrap: 'nowrap',
        borderWidth: '1px'
    },
    headerCustomerLogo: {
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',
        alignContent: 'center',
        objectFit: 'fill'
        },
    headerToolbar: {
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',        
        alignContent: 'center',
    },    
});

enum AppState {
    ProbeForBackend,
    SettingUserInfo,
    ErrorLoadingUserInfo,
    LoadingChats,
    Chat,
    SigningOut,
}

const App: FC = () => {
    const classes = useClasses();

    const [appState, setAppState] = React.useState(AppState.ProbeForBackend);
    const dispatch = useAppDispatch();

    const { instance, inProgress } = useMsal();
    const { activeUserInfo, features, isMaintenance } = useAppSelector((state: RootState) => state.app);
    const isAuthenticated = useIsAuthenticated();

    const chat = useChat();
    const file = useFile();

    useEffect(() => {
        if (isMaintenance && appState !== AppState.ProbeForBackend) {
            setAppState(AppState.ProbeForBackend);
            return;
        }

        if (isAuthenticated) {
            if (appState === AppState.SettingUserInfo) {
                if (activeUserInfo === undefined) {
                    const account = instance.getActiveAccount();
                    if (!account) {
                        setAppState(AppState.ErrorLoadingUserInfo);
                    } else {
                        dispatch(
                            setActiveUserInfo({
                                id: `${account.localAccountId}.${account.tenantId}`,
                                email: account.username, // Username in an AccountInfo object is the email address
                                username: account.name ?? account.username,
                            }),
                        );

                        // Privacy disclaimer for internal Microsoft users
                        // if (account.username.split('@')[1] === 'microsoft.com') {
                        //     dispatch(
                        //         addAlert({
                        //             message:
                        //                 'By using Chat Copilot, you agree to protect sensitive data, not store it in chat, and allow chat history collection for service improvements. This tool is for internal use only.',
                        //             type: AlertType.Info,
                        //         }),
                        //     );
                        // }

                        setAppState(AppState.LoadingChats);
                    }
                } else {
                    setAppState(AppState.LoadingChats);
                }
            }
        }

        if ((isAuthenticated || !AuthHelper.IsAuthAAD) && appState === AppState.LoadingChats) {
            void Promise.all([
                // Load all chats from memory
                chat.loadChats().then((succeeded) => {
                    if (succeeded) {
                        setAppState(AppState.Chat);
                    }
                }),

                // Check if content safety is enabled
                file.getContentSafetyStatus(),

                // Load service options
                chat.getServiceOptions().then((serviceOptions) => {
                    if (serviceOptions) {
                        dispatch(setServiceOptions(serviceOptions));
                    }
                }),
            ]);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instance, inProgress, isAuthenticated, appState, isMaintenance]);

    // TODO: [Issue #41] handle error case of missing account information
    return (
        <FluentProvider
            className="app-container"
            theme={features[FeatureKeys.DarkMode].enabled ? semanticKernelDarkTheme : semanticKernelLightTheme}
        >
            {AuthHelper.IsAuthAAD ? (
                <>
                    <UnauthenticatedTemplate>
                        <div className={classes.container}>
                            <div className={classes.header}>
                                <div className={classes.headerLeft}>
                                    <LogoSection />
                                </div>
                                <div className={classes.headerRight}>
                                    <div className={classes.headerCustomerLogo}>
                                        <Image src={abelLogo} />
                                    </div>
                                    <UserSettingsMenu setLoadingState={() => {setAppState(AppState.SigningOut);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        {appState === AppState.SigningOut && <Loading text="Signing you out..." />}
                        {appState !== AppState.SigningOut && <Login />}
                    </UnauthenticatedTemplate>
                    <AuthenticatedTemplate>
                        <Chat classes={classes} appState={appState} setAppState={setAppState} />
                    </AuthenticatedTemplate>
                </>
            ) : (
                <Chat classes={classes} appState={appState} setAppState={setAppState} />
            )}
        </FluentProvider>
    );
};

const Chat = ({
    classes,
    appState,
    setAppState,
}: {
    classes: ReturnType<typeof useClasses>;
    appState: AppState;
    setAppState: (state: AppState) => void;
}) => {
    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.headerLeft}>
                    <LogoSection />
                </div>
                {appState > AppState.SettingUserInfo && (
                    <div className={classes.headerRight}>
                        <Image src={abelLogo} className={classes.headerCustomerLogo}/>
                        <div className={classes.headerToolbar}>
                            <PluginGallery />
                            <UserSettingsMenu setLoadingState={() => {setAppState(AppState.SigningOut);
                                        }}
                                    />
                        </div>
                    </div>
                )}
            </div>
            {appState === AppState.ProbeForBackend && (
                <BackendProbe
                    uri={process.env.REACT_APP_BACKEND_URI as string}
                    onBackendFound={() => {
                        if (AuthHelper.IsAuthAAD) {
                            setAppState(AppState.SettingUserInfo);
                        } else {
                            setAppState(AppState.LoadingChats);
                        }
                    }}
                />
            )}
            {appState === AppState.SettingUserInfo && (
                <Loading text={'Hang tight while we fetch your information...'} />
            )}
            {appState === AppState.ErrorLoadingUserInfo && (
                <Error text={'Oops, something went wrong. Please try signing out and signing back in.'} />
            )}
            {appState === AppState.LoadingChats && <Loading text="Loading Chats..." />}
            {appState === AppState.Chat && <ChatView />}
        </div>
    );
};

export default App;
