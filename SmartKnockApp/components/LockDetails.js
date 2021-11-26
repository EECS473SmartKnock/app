// LockDetails page. here you can lock/unlock using web api 
// or you can try to connect over BLE to change WiFi network

import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
    Modal,
    TextInput
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { sha256 } from 'react-native-sha256';
import { Buffer } from 'buffer';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


import * as api from '../api';
import { ssidCharacteristicUUID, wifiServiceUUID, hashCharacteristicUUID, resetCharacteristicUUID, resetChallengeCharacteristicUUID, passwordCharacteristicUUID } from '../config';

export default class LockDetails extends Component {
    constructor(props) {
        super(props);
        this.state = {
            lock: props.route.params.lock,
            stats: {
                battery: 0,
                knocks: 0,
            },
            settingsModalVisible: false,
            ssid: '',
            password: '',
            error: '',
            bleConnected: false,
            modalWaiting: false
        }

        this.device = null;
    }

    componentWillUnmount() {
        if (this.device) {
            // Disconnect from BLE
            this.device.cancelConnection();
        }
    }

    async componentDidMount() {
        console.log('LockDetails mounted');
        console.log(this.state.lock);

        this.props.navigation.setParams({
            title: this.state.lock.name,
        });

        api.getStats(this.state.lock.id).then(stats => {
            this.setState({
                stats: stats
            });
        });

        await this.connectBLE();
    }

    async connectBLE() {
        let bleManager = new BleManager();
        bleManager.startDeviceScan([wifiServiceUUID], null, async (error, device) => {
            if (error) {
                this.setState({
                    error: error.message
                });
                return;
            }
            let id = device.id;

            // TODO: restore this once done testing
            if (device.id === this.state.lock.bleID || true) {
                bleManager.stopDeviceScan();
                try {
                    let device = await bleManager.connectToDevice(id);

                    await device.discoverAllServicesAndCharacteristics();
                    this.device = device;
                    this.setState({
                        bleConnected: true
                    });
                }
                catch (err) {
                    this.setState({
                        error: err.message
                    });
                }
            }
            else {
                this.setState({
                    error: 'Device not found'
                });
            }
        });
    }


    async updateWifi(ssid, password, passphrase) {
        let device = this.device;
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

        // Create sha256(ssid+password+passphrase)
        let hash = await sha256(ssid + password + passphrase);
        console.log(hash);
        let b64hash = Buffer.from(hash).toString('base64');
        device.writeCharacteristicWithResponseForService(wifiServiceUUID, hashCharacteristicUUID, b64hash).catch(err => {
            this.setState({
                error: err
            });
        });
    }


    async resetLock() {
        let device = this.device;
        // Read ResetChallenge characterstic, then compute hash of challenge+passphrase and write it to Reset characterstic
        let challenge64 = await device.readCharacteristicForService(wifiServiceUUID, resetChallengeCharacteristicUUID).catch(err => {
            this.setState({
                error: err
            });
        });
        let challenge = Buffer.from(challenge64.value, 'base64').toString();
        console.log(challenge, this.state.lock.passphrase);
        let hash = await sha256(challenge + this.state.lock.passphrase);
        let b64hash = Buffer.from(hash).toString('base64');
        await device.writeCharacteristicWithResponseForService(wifiServiceUUID, resetCharacteristicUUID, b64hash).catch(err => {
            this.setState({
                error: err
            });
        });

        // Remove from storage
        let data = await AsyncStorage.getItem('deviceList');
        let deviceList = JSON.parse(data);
        deviceList = deviceList.filter(device => device.id !== this.state.lock.id);
        await AsyncStorage.setItem('deviceList', JSON.stringify(deviceList));
    }


    render() {

        let modal = (
            <Modal
                animationType="slide"
                transparent={false}
                visible={this.state.settingsModalVisible}
                onRequestClose={() => {
                    this.setState({
                        settingsModalVisible: false
                    });
                }
                }>
                <View style={styles.container}>
                    <Text>Change WiFi Settings</Text>
                    <Text>SSID: </Text>
                    <TextInput style={styles.input}
                        placeholder="SSID"
                        autoCorrect={false}
                        onChangeText={(text) => this.setState({ ssid: text })} />
                    <Text>Password: </Text>
                    <TextInput style={styles.input}
                        placeholder="Password"
                        autoCorrect={false}
                        onChangeText={(text) => this.setState({ password: text })} />
                    <Pressable onPress={() => {
                        this.updateWifi(this.state.ssid, this.state.password, this.state.lock.passphrase);
                        this.setState({
                            settingsModalVisible: false
                        });
                    }
                    }>
                        <Text>Submit</Text>
                    </Pressable>
                    <Pressable onPress={async () => {
                        this.setState({
                            modalWaiting: true
                        });
                        await this.resetLock();
                        this.setState({
                            settingsModalVisible: false,
                            modalWaiting: false
                        });
                        this.props.navigation.goBack();
                    }
                    }>
                        <Text>Factory Reset</Text>
                    </Pressable>

                    <Pressable onPress={() => {
                        this.setState({
                            settingsModalVisible: false
                        });
                    }
                    }>
                        <Text>Cancel</Text>
                    </Pressable>
                </View>
            </Modal>
        );

        return (
            <View style={styles.container} >
                <Text>{JSON.stringify(this.state.error)}</Text>
                <Text>Battery: {this.state.stats.battery} </Text>
                <Text>Knocks: {this.state.stats.knocks} </Text>
                <Pressable onPress={() => {
                    api.lock(this.state.lock.id, this.state.lock.passphrase).then(() => {
                        this.setState({
                            lock: {
                                ...this.state.lock,
                                locked: true
                            }
                        });
                    }
                    )
                }}>
                    <Text>Lock</Text>
                </Pressable>
                <Pressable onPress={() => {
                    api.unlock(this.state.lock.id, this.state.lock.passphrase).then(() => {
                        this.setState({
                            lock: {
                                ...this.state.lock,
                                locked: false
                            }
                        });
                    }
                    )
                }}>
                    <Text>Unlock</Text>
                </Pressable>

                <Pressable onPress={() => {
                    this.setState({
                        settingsModalVisible: true
                    });
                }}>
                    <Text>Change WiFi Settings</Text>
                </Pressable>
                {this.state.modalWaiting && <ActivityIndicator size="large" color="#0000ff" />}
                {this.state.bleConnected ? modal : <Text>Connecting to BLE</Text>}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#888',
        alignItems: 'center',

    },
    input: {
        height: 40,
        width: 200,
        borderColor: 'gray',
        borderWidth: 1,
        margin: 10
    }
});
