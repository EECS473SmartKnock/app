// button to add new device
// list of previously connected devices. tapping on one will take you to details page

import React, { Component } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    StyleSheet,
    Text,
    View,
    Button,
    FlatList
} from 'react-native';

import { FAB, Divider, ListItem } from 'react-native-elements';
import TouchableScale from 'react-native-touchable-scale';
import { withTheme, ThemeProvider } from 'react-native-elements';


class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            deviceList: [],
        }
    }

    componentDidMount() {
        this.getList();
    }

    getList = async () => {
        try {
            const value = await AsyncStorage.getItem('deviceList');
            if (value !== null) {
                this.setState({ deviceList: JSON.parse(value) });
            }
        } catch (error) {
            console.log(error);
        }
        // let deviceList = [
        //     {
        //         id: '37c985bfec31e0192f5d64ecfe41bb4824c47e0b4835a01ea0d238876f27151e',
        //         name: 'Lock 1',
        //         bleID: '00:00:00:00:00:00',
        //         passphrase: 'test'
        //     },
        //     {
        //         id: '37c985bfec31e0192f5d64ecfe41bb4824c47e0b4835a01ea0d238876f27151e',
        //         name: 'Lock 1',
        //         bleID: '00:00:00:00:00:00',
        //         passphrase: 'test'
        //     },
        //     {
        //         id: '37c985bfec31e0192f5d64ecfe41bb4824c47e0b4835a01ea0d238876f27151e',
        //         name: 'Lock 1',
        //         bleID: '00:00:00:00:00:00',
        //         passphrase: 'test'
        //     },
        //     {
        //         id: '37c985bfec31e0192f5d64ecfe41bb4824c47e0b4835a01ea0d238876f27151e',
        //         name: 'Lock 1',
        //         bleID: '00:00:00:00:00:00',
        //         passphrase: 'test'
        //     },

        // ]
        // this.setState({ deviceList });
    }

    deleteItem = (index) => {
        let deviceList = this.state.deviceList;
        deviceList.splice(index, 1);
        this.setState({ deviceList });
        AsyncStorage.setItem('deviceList', JSON.stringify(deviceList));
    }

    render() {
        let list = this.state.deviceList.map((item, index) => {

            return (

                <ListItem.Swipeable key={index}
                    rightContent={
                        <Button
                            title="Delete"
                            icon={{ name: 'delete', color: 'white' }}
                            buttonStyle={{ minHeight: '100%', backgroundColor: 'red' }}
                            onPress={() => {
                                this.deleteItem(index);
                            }}
                        />}
                    Component={TouchableScale}
                    friction={30} //
                    tension={300} // These props are passed to the parent component (here TouchableScale)
                    activeScale={0.95}
                    onPress={() => {
                        this.props.navigation.navigate('LockDetails', {
                            lock: item
                        })
                    }}
                >
                    <ListItem.Content>
                        <ListItem.Title>{item.name}</ListItem.Title>

                    </ListItem.Content>
                    <ListItem.Chevron />
                </ListItem.Swipeable >

            )
        });

        return (
            <View style={styles.container}>
                {/* <Divider orientation="horizontal" /> */}
                <View style={styles.list}>
                    {list}
                </View>
                <FAB title="Setup new lock" onPress={() => {
                    this.props.navigation.navigate('AddLock');
                }}></FAB>
                  <ThemeProvider useDark={true} />
            </View>
            
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eee',
        color: '#000'
    },
    elem: {
        color: '#000',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    text: {
        color: '#000',
    },
    list: {
        width: '100%',
    }
});

export default withTheme(Home);