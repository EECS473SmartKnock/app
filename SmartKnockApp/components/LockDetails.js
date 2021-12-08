// LockDetails page. here you can lock/unlock using web api 
// or you can try to connect over BLE to change WiFi network

import React, { Component, useState } from 'react';
import {
    StyleSheet,
    View,
    Pressable,
    Modal,
    TextInput
} from 'react-native';
import { Text, Input } from 'react-native-elements';
import { BleManager } from 'react-native-ble-plx';
import { sha256 } from 'react-native-sha256';
import { Buffer } from 'buffer';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearProgress } from 'react-native-elements';
import { Tab, TabView, Button, Card, Overlay } from 'react-native-elements';
import { Toast } from 'react-native-toast-message/lib/src/Toast';




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
            modalWaiting: false,
            resetConfirmPopupVisible: false,
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
            // If last update was more than an hour ago, show a Toast
            console.log(stats);
            if (stats.time_updated < Date.now() - 3600000) {
                Toast.show({
                    text1: 'Last update was more than an hour ago.',
                    text2: 'There might be a problem with the lock.',
                    buttonText: 'Okay',
                    duration: 10000,
                    type: 'error'
                });
            }
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
            console.log(device);
            let id = device.id;

            // TODO: restore this once done testing
            if (device.id === this.state.lock.bleID) {
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
            this.showError(err);
        });
        await device.writeCharacteristicWithResponseForService(wifiServiceUUID, passwordCharacteristicUUID, b64password).catch(err => {
            this.setState({
                error: err
            });
            this.showError(err);
        });

        // Create sha256(ssid+password+passphrase)
        let hash = await sha256(ssid + password + passphrase);
        console.log(hash);
        let b64hash = Buffer.from(hash).toString('base64');
        device.writeCharacteristicWithResponseForService(wifiServiceUUID, hashCharacteristicUUID, b64hash).catch(err => {
            this.setState({
                error: err
            });
            this.showError(err);
        });
    }


    async resetLock() {
        let device = this.device;
        // Read ResetChallenge characterstic, then compute hash of challenge+passphrase and write it to Reset characterstic
        let challenge64 = await device.readCharacteristicForService(wifiServiceUUID, resetChallengeCharacteristicUUID).catch(err => {
            this.setState({
                error: err
            });
            this.showError(err);
        });
        let challenge = Buffer.from(challenge64.value, 'base64').toString();
        console.log(challenge, this.state.lock.passphrase);
        let hash = await sha256(challenge + this.state.lock.passphrase);
        let b64hash = Buffer.from(hash).toString('base64');
        await device.writeCharacteristicWithResponseForService(wifiServiceUUID, resetCharacteristicUUID, b64hash).catch(err => {
            this.setState({
                error: err
            });
            this.showError(err);
        });

        // Remove from storage
        let data = await AsyncStorage.getItem('deviceList');
        let deviceList = JSON.parse(data);
        deviceList = deviceList.filter(device => device.id !== this.state.lock.id);
        await AsyncStorage.setItem('deviceList', JSON.stringify(deviceList));
    }

    showError(error) {
        Toast.show({
            text: JSON.stringify(error),
            buttonText: 'Okay',
            duration: 3000,
            type: 'error'
        });
    }

    onLockGroupPress() {
    }


    render() {
        const buttons = ['Lock', 'Unlock'];

        let resetConfirmPopup = (
            <Overlay isVisible={this.state.resetConfirmPopupVisible} onBackdropPress={() => {
                this.setState({ resetConfirmPopupVisible: !this.state.resetConfirmPopupVisible });
            }}>
                <View style={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 20
                }}>
                    <Text style={{ color: '#fff' }}>Are you sure you want to reset the lock?</Text>
                    <View style={{ flexDirection: 'row', marginTop: 20 }}>
                        <Button title="Yes" onPress={async () => {
                            await this.resetLock();
                            this.setState({ resetConfirmPopupVisible: !this.state.resetConfirmPopupVisible });
                            this.props.navigation.goBack();
                        }} />
                        <Button title="No" onPress={() => {
                            this.setState({ resetConfirmPopupVisible: !this.state.resetConfirmPopupVisible });
                        }} />
                    </View>
                </View>
            </Overlay>
        );

        let remoteAccess = (
            <View>
                <View style={{
                    height: '100%',
                }}>
                    <Card containerStyle={{
                        height: 150,
                    }} wrapperStyle={{}}>
                        <Card.Title>Status</Card.Title>
                        <Card.Divider />
                        <View
                            style={{
                                position: "relative",
                                // alignItems: "center",
                                justifyContent: "center",
                                flex: 8,
                                flexDirection: "row",
                                height: 100
                            }}
                        >
                            <Text style={{
                                fontSize: 14,
                                height: 100,
                                width: 100,
                            }}>Battery: {this.state.stats.battery} </Text>
                            <Text style={{
                                fontSize: 14,
                                height: 100,
                                width: 100,
                            }}>Knocks: {this.state.stats.knocks} </Text>
                        </View>
                    </Card>
                    <Card containerStyle={{
                        height: 150,
                    }} wrapperStyle={{}}>
                        <Card.Title>Control</Card.Title>
                        <Card.Divider />
                        <View
                            style={{
                                // position: "relative",
                                // // alignItems: "center",
                                // justifyContent: "center",
                                // flex: 3,
                                // flexDirection: "row",
                                height: 300
                            }}
                        >
                            <Button
                                style={{
                                    fontSize: 14,
                                    height: 100,
                                    width: 100,
                                }}
                                onPress={() => {
                                    api.lock(this.state.lock.id, this.state.lock.passphrase).then(() => {
                                        this.setState({
                                            lock: {
                                                ...this.state.lock,
                                                locked: true
                                            }
                                        });
                                    }
                                    )
                                }}

                                title="Lock">
                            </Button>

                            <Button onPress={() => {
                                api.unlock(this.state.lock.id, this.state.lock.passphrase).then(() => {
                                    this.setState({
                                        lock: {
                                            ...this.state.lock,
                                            locked: false
                                        }
                                    });
                                }
                                )
                            }}
                                style={{ flex: 1, flexDirection: 'row', margin: 10 }}
                                title="Unlock">
                            </Button>
                        </View>
                    </Card>
                </View>
                <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', margin: 10 }}>

                    </View>
                    <View style={{ flexDirection: 'row', margin: 10 }}>

                    </View>
                </View>
            </View>);

        let bleSettings = (
            <View>
                <View style={{
                    height: '100%',
                }}>
                    <Card containerStyle={{
                        height: 350,
                    }} wrapperStyle={{}}>
                        <Card.Title>WiFi Settings</Card.Title>
                        <Card.Divider />
                        <View
                            style={{
                                // position: "relative",
                                // alignItems: "center",
                                // justifyContent: "center",
                                flex: 5,
                                height: 300
                            }}
                        >
                            <View style={{
                                height: 100,
                                width: '100%',
                            }}>
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
                                {/* </View>
                            <View style={{
                                height: 40,
                                width: '100%',
                            }}> */}
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
                                <Button
                                    title="Save"
                                    onPress={async () => {
                                        await this.updateWifi(this.state.ssid, this.state.password, this.state.lock.passphrase);
                                        this.setState({
                                            lock: {
                                                ...this.state.lock,
                                                ssid: this.state.ssid,
                                                password: this.state.password
                                            }
                                        });
                                        Toast.show({
                                            text1: 'WiFi settings saved',
                                            type: 'success',
                                        });
                                    }}
                                />
                            </View>
                        </View>
                    </Card>
                    <Card containerStyle={{
                        height: 150,
                    }} wrapperStyle={{}}>
                        <Card.Title>Control</Card.Title>
                        <Card.Divider />
                        <View
                            style={{
                                // position: "relative",
                                // // alignItems: "center",
                                // justifyContent: "center",
                                // flex: 3,
                                // flexDirection: "row",
                                height: 300
                            }}
                        >
                            <Button
                                style={{
                                    fontSize: 14,
                                    height: 100,
                                    width: 100,
                                    color: '#f00'
                                }}
                                onPress={async () => {
                                    this.setState({
                                        resetConfirmPopupVisible: true,
                                    })
                                }}

                                title="Reset Device">
                            </Button>

                        </View>
                    </Card>
                </View >
            </View >
        );

        return (
            <View style={styles.container} >
                <Tab value={this.state.index} onChange={(index) => {
                    this.setState({
                        index: index
                    });
                }}>
                    <Tab.Item title="Remote Access" />
                    <Tab.Item title="Local Settings" />
                </Tab>
                <TabView value={this.state.index} onChange={(index) => {
                    this.setState({
                        index: index
                    });
                }} >
                    <TabView.Item style={{ width: '100%' }}>
                        {remoteAccess}
                    </TabView.Item>
                    <TabView.Item style={{ width: '100%' }}>
                        {this.state.bleConnected ? bleSettings : <ActivityIndicator size="large" />}
                    </TabView.Item>
                </TabView>
                {this.state.modalWaiting && <ActivityIndicator size="large" color="#0000ff" />}
                <Toast />
                {resetConfirmPopup}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#888',
        // alignItems: 'center',

    },
    input: {
        height: 40,
        width: 200,
        // borderColor: 'gray',
        borderWidth: 1,
        margin: 10
    }
});
