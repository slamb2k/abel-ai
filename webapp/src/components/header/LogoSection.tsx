import { Image, makeStyles } from '@fluentui/react-components';
import '../../index.css';

import abelLogo from '../../assets/abel-logo.png';
import abelTypeLogo from '../../assets/abel-logo.png';

const useClasses = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
    },
    bgHeaderLogo: {
        backgroundImage: `url("../../assets/abel-logo.png")`,
        backgroundSize: 'fit',
        backgroundRepeat: 'no-repeat',
    },
    headerLogo: {
        height: '180px',
        marginTop: '0px',
        marginLeft: '20px',
        zIndex: '-0.5',
        },
    headerTitle: {
        fontSize: '4em',
        color: 'white',
        flexGrow: 1,
        maxHeight: '96px',
        justifyItems: 'center',
        position: 'absolute',
        transform: 'scale(0.75)',
        fontFamily: 'IsidoraSans',
        letterSpacing: '0.1em',
    },
    headerBoldTitle: {
        fontSize: '5em',
        fontWeight: 'bold',
        color: 'white',
        flexGrow: 1,
        maxHeight: '96px',
    },
});

export const LogoSection = () => {
    const classes = useClasses();

    return (
        <div className={classes.root}>
            <Image className={classes.headerLogo} src={abelLogo} style={{ alignSelf: 'flex-start' }} />
            <Image className={classes.headerTitle} src={abelTypeLogo} />
        </div>
    );
};
