import React from 'react';
import { Text, View, StyleSheet, Button, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

export default class BLEScan extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            scanning: false,
            peripherals: new Map(),
            isConnected: false,
        };
        this.manager = new BleManager();
    }

    componentDidMount() {
        PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                'title': 'Location Access Required',
                'message': 'This App needs to Access your location ' +
                    'so you can find nearby BLE devices.'
            }
        ).then((granted) => {
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log("You can use the location");

                this.scanAndConnect();
            } else {
                console.log("Location permission denied");
            }
        });
    }

    scanAndConnect() {
        // If a scan is already running, stop it
        this.manager.stopDeviceScan();
        this.setState({ peripherals: new Map() });
        this.manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log('Error: ', error);
                return;
            }
            if (device.name) {
                this.setState({ peripherals: this.state.peripherals.set(device.id, device) });
            }
        });
    }

    render() {
        const list = [];
        this.state.peripherals.forEach((device, id) => {
            const color = device.connected ? 'green' : 'red';
            list.push(
                <Button key={id} style={{ ...styles.device, color }} onPress={
                    () => {
                        this.setState({ isConnected: true });
                        this.props.navigation.navigate('BLEConnect', {
                            device: device,
                            manager: this.manager,
                            isConnected: this.state.isConnected,
                        });
                    }
                } title={device.name}></Button>
            );
        });
        return (
            <View style={styles.container} >
                <Text style={styles.welcome}>
                    Scanning for BLE devices...
                </Text>
                <ScrollView>
                    {list}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
        backgroundColor: '#F5FCFF',
        color: '#000000',
    },
    device: {
        fontSize: 16,
        textAlign: 'center',
        margin: 10,
        backgroundColor: '#F5FCFF'
    },
});
