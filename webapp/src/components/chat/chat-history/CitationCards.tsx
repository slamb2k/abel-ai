// Copyright (c) Microsoft. All rights reserved.

import {
    Badge,
    Button,
    Caption1,
    Card,
    CardFooter,
    CardHeader,
    Text,
    makeStyles,
    shorthands,
} from '@fluentui/react-components';
import { ArrowDownload24Regular, FolderOpenRegular } from '@fluentui/react-icons';
import React, { useState } from 'react';
import { useChat } from '../../../libs/hooks';
import { Citation, IChatMessage } from '../../../libs/models/ChatMessage';
import { customTokens } from '../../../styles';

const useClasses = makeStyles({
    root: {
        display: 'flex',
        ...shorthands.gap(customTokens.spacingVerticalS),
        flexDirection: 'column',
    },
    card: {
        display: 'flex',
        width: '100%',
        height: 'fit-content',
    },
});

interface ICitationCardsProps {
    message: IChatMessage;
}

export const CitationCards: React.FC<ICitationCardsProps> = ({ message }) => {
    const classes = useClasses();
    const chat = useChat();

    const [showSnippetStates, setShowSnippetStates] = useState<boolean[]>([]);
    React.useEffect(() => {
        initShowSnippetStates();
        // This will only run once, when the component is mounted
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!message.citations || message.citations.length === 0) {
        return null;
    }

    const initShowSnippetStates = () => {
        if (!message.citations) {
            return;
        }

        const newShowSnippetStates = [...showSnippetStates];
        message.citations.forEach((_, index) => {
            newShowSnippetStates[index] = false;
        });
        setShowSnippetStates(newShowSnippetStates);
    };

    const onDownloadCitedDocument = (citation : Citation) => {
        void chat.downloadCitedDocument(citation, false);
    };

    const onOpenCitedDocument = (citation : Citation) => {
        void chat.downloadCitedDocument(citation, true);
    };    

    return (
        <div className={classes.root}>
            {message.citations.map((citation, index) => {
                return (
                    <Card className={classes.card} key={`citation-card-${index}`}>
                        <CardHeader
                            image={
                            <Badge
                                shape="circular"
                                appearance="filled"
                                color="brand"
                                size="extra-large"
                            >
                                {index + 1}
                            </Badge>
                            }
                            header={<Text weight="semibold">{citation.sourceName}</Text>}
                            description={<Caption1>Relevance score: {citation.relevanceScore.toFixed(3)}</Caption1>}
                        />

                        <CardFooter>
                            <Button
                                icon={<FolderOpenRegular />}
                                onClick={() => { onOpenCitedDocument(citation) }}
                            >Open</Button>
                            <Button
                                icon={<ArrowDownload24Regular />}
                                onClick={() => { onDownloadCitedDocument(citation) }}
                            >Download</Button>                            
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
};
