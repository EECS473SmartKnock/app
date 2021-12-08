// Page to add a new lock
// First scan for the lock, then form to set passphrase and wifi credentials. Once set, add to storage.

import React, { Component } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { ListItem, Input, Button } from 'react-native-elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
    View,
    Text,

} from 'react-native';

import { PermissionsAndroid, TextInput } from 'react-native';
import { wifiServiceUUID, ssidCharacteristicUUID, passwordCharacteristicUUID, passphraseCharacteristicUUID, MACCharacteristicUUID } from '../config';
import { Buffer } from 'buffer';
import { sha256 } from 'react-native-sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';


class Scan extends Component {
    constructor(props) {
        super(props);
        this.state = {
            scanning: false,
            peripherals: new Map(),
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

                this.scan();
            } else {
                console.log("Location permission denied");
            }
        }

        );
    }

    scan() {
        this.manager.stopDeviceScan();
        this.setState({ peripherals: new Map() });
        this.manager.startDeviceScan([wifiServiceUUID], null, (error, device) => {
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
        let list = [];
        this.state.peripherals.forEach((device, key) => {
            list.push(
                <ListItem
                    key={key}
                    title={device.name}
                    subtitle={device.id}
                    onPress={() => {
                        this.manager.stopDeviceScan();
                        this.props.navigation.navigate('Form', { device: device })
                    }}
                >
                    <ListItem.Content>
                        <ListItem.Title>{device.name}</ListItem.Title>
                    </ListItem.Content>
                    <ListItem.Chevron />
                </ListItem>
            );
        });
        return (
            <View style={
                {
                    width: '100%',
                }
            }>
                {list}
            </View>
        );
    }
};


class Form extends Component {
    constructor(props) {
        super(props);
        this.state = {
            device: props.route.params.device,
            name: '',
            passphrase: '',
            ssid: '',
            password: '',
            error: '',
            macAddress: '',
            ready: false
        };

        this.device = props.route.params.device;
        this.manager = new BleManager();
        this.manager.connectToDevice(this.device.id).then(async device => {
            this.device = device;
            await this.device.discoverAllServicesAndCharacteristics();

            this.setState({ ready: true });
            await this.device.readCharacteristicForService(wifiServiceUUID, MACCharacteristicUUID).then(async char => {
                let macAddress = Buffer.from(char.value, 'base64').toString();
                this.setState({ macAddress });
            });
        });
    }

    render() {
        if (!this.state.ready) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }}>
                    <Text>Connecting...</Text>
                </View>
            );
        }
        return (
            <View style={
                {
                    flex: 1,
                    margin: 10,
                }
            }>
                {/* <Text>Mac: {this.state.macAddress}</Text> */}
                {/* <Text style={
                    {
                        fontSize: 20,
                        marginBottom: 20,
                    }
                }>
                    {this.state.device.name}
                </Text> */}
                <Input
                    label='Name'
                    placeholder=''
                    style={
                        {
                            height: 40,
                            width: '100%',
                        }
                    }
                    onChangeText={(text) => this.setState({ name: text })}
                    value={this.state.name}
                />
               <Input
                    label='Passphrase'
                    placeholder=''
                    style={
                        {
                            height: 40,
                            width: '100%',
                        }
                    }
                    onChangeText={(text) => this.setState({ passphrase: text })}
                    value={this.state.passphrase}
                />

                <Input 
                    label='WiFi SSID'
                    placeholder=''
                    style={
                        {
                            height: 40,
                            width: '100%',
                        }
                    }
                    onChangeText={(text) => this.setState({ ssid: text })}
                    value={this.state.ssid}
                />
                <Input
                    label='WiFi Password'
                    placeholder=''
                    style={
                        {
                            height: 40,
                            width: '100%',
                        }
                    }
                    onChangeText={(text) => this.setState({ password: text })}
                    value={this.state.password}
                />
                <Text style={{ color: 'red' }}>{this.state.error ? JSON.stringify(this.state.error) : ""}</Text>
                <Button
                    title='Add'
                    onPress={this.addLock.bind(this)}
                />
            </View>
        );
    }
    async addLock() {
        if (this.state.passphrase === '' || this.state.ssid === '' || this.state.password === '') {
            this.setState({ error: 'Please fill in all fields' });
            return;
        }
        this.setState({ error: '' });

        let device = this.device;
        let passphrase = this.state.passphrase;
        let ssid = this.state.ssid;
        let password = this.state.password;
        let b64passphrase = Buffer.from(passphrase).toString('base64');
        let b64ssid = Buffer.from(ssid).toString('base64');
        let b64password = Buffer.from(password).toString('base64');

        await device.writeCharacteristicWithResponseForService(wifiServiceUUID, ssidCharacteristicUUID, b64ssid).catch(err => {
            this.setState({
                error: err
            });
        });

        await device.writeCharacteristicWithResponseForService(wifiServiceUUID, passwordCharacteristicUUID, b64password).catch(err => {
            this.setState({
                error: err
            });
        });

        await device.writeCharacteristicWithoutResponseForService(wifiServiceUUID, passphraseCharacteristicUUID, b64passphrase).catch(err => {
            this.setState({
                error: err
            });
        });

        // Add to storage
        let data = await AsyncStorage.getItem('deviceList');
        let deviceList = JSON.parse(data);
        if (!deviceList) {
            deviceList = [];
        }

        let uniqueId = await sha256(this.state.macAddress + this.state.passphrase);
        deviceList.push({
            name: this.state.name,
            passphrase: this.state.passphrase,
            ssid: this.state.ssid,
            password: this.state.password,
            bleID: this.state.device.id,
            macAddress: this.state.macAddress,
            id: uniqueId
        });

        await AsyncStorage.setItem('deviceList', JSON.stringify(deviceList));

        // Go back to Home
        this.props.navigation.goBack();
    }
}


const AddLockStack = createNativeStackNavigator();

export default function AddLock() {
    return (
        <AddLockStack.Navigator
            initialRouteName="Scan"
            screenOptions={{
                headerShown: false,
            }}>
            <AddLockStack.Screen name="Scan" component={Scan} />
            <AddLockStack.Screen name="Form" component={Form} />
        </AddLockStack.Navigator>
    );
}