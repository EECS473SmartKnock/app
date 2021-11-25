import React from "react";
import { BleManager } from "react-native-ble-plx";
import {
    View,
    Text,
    StyleSheet,
    Button,
    ActivityIndicator,
    TextInput
} from "react-native";

import { Buffer } from "buffer"

import { wifiServiceUUID, ssidCharacteristicUUID, passwordCharacteristicUUID } from '../config'

export default class BLEConnect extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            device: null,
            connected: false,
            services: null,
            characteristics: null,
            value: null,
            error: null,
            ssid: "",
            password: "",
            showDebug: true
        };

        this.device = this.props.route.params.device;

        this.manager = this.props.route.params.manager ?? new BleManager();
        this.sendCredentials = this.sendCredentials.bind(this);
    }

    componentDidMount() {
        // Get the BLE device from navigation params

        console.log(wifiServiceUUID);

        let device = this.props.route.params.device;
        this.setState({
            device
        });

        this.manager.connectToDevice(device.id).then(async device => {


            await device.discoverAllServicesAndCharacteristics();

            this.setState({
                connected: true,
                device: device
            });

            this.device = device;

            // device.readCharacteristicForService(
            //     "7fc9c7df-28b0-4177-ad55-60ba10b1d1dd",
            //     "940c872e-2939-4162-81ae-648fa80382c4"
            // ).then(characteristic => {
            //     let value = characteristic.value;
            //     this.setState({
            //         value,
            //         error: "it worked"
            //     });
            //     setTimeout(() => {
            //         this.setState({
            //             error: null
            //         });
            //         device.writeCharacteristicWithResponseForService(wifiServiceUUID,
            //             ssidCharacteristicUUID, "YWJjZDEyMzQ=").then(() => {
            //                 this.setState({
            //                     error: "it worked"
            //                 });
            //             }).catch(err => {
            //                 this.setState({
            //                     error: err
            //                 });
            //             });
            //     }, 5000);

            // }).catch(error => {
            //     this.setState({
            //         error
            //     });
            // });
        });
    }

    async sendCredentials() {
        console.log(this.device);
        console.log(this.state.device);
        console.log(this.props.route.params.device);
        let device = this.device;
        let b64ssid = Buffer.from(this.state.ssid).toString('base64');
        let b64password = Buffer.from(this.state.password).toString('base64');
        device.writeCharacteristicWithResponseForService(wifiServiceUUID, ssidCharacteristicUUID, b64ssid).catch(err => {
            this.setState({
                error: err
            });
        });
        device.writeCharacteristicWithResponseForService(wifiServiceUUID, passwordCharacteristicUUID, b64password).catch(err => {
            this.setState({
                error: err
            });
        });
    }

    render() {
        let debug = this.state.showDebug ? null : (<View>
            <Text style={styles.info}>{this.state.connected ? "Connected" : "Not Connected"}</Text>
            <Text style={styles.info}>{this.state.device ? this.state.device.id : "No Device"}</Text>
            <Text style={styles.info}>{this.state.device ? JSON.stringify(this.state.device.serviceUUIDs) : "No Device"}</Text>
            <Text style={styles.info}>{this.state.services ? JSON.stringify(this.state.services) : "No Services"}</Text>
            <Text style={styles.info}>{this.state.characteristics ? this.state.characteristics.length : "No Characteristics"}</Text>
            <Text style={styles.info}>{this.state.value ? this.state.value : "No Value"}</Text>
            <Text style={styles.info}>{Buffer.from(this.state.ssid).toString('base64')}</Text>
            <Text style={styles.info}>{Buffer.from(this.state.password).toString('base64')}</Text>
            <Text style={styles.info}>{this.state.error ? JSON.stringify(this.state.error) : "No Error"}</Text>
        </View>);

        // Editable textboxes to set WiFi SSID and password
        // If still connecting, show a loading spinner and disable the textboxes

        if (!this.state.connected) {
            return (<View>
                {debug}
                <ActivityIndicator size="large" color="#0000ff" />
            </View>);
        }

        return (
            <View>
                {debug}

                <TextInput style={styles.input} placeholder="SSID" autoCorrect={false} onChangeText={(text) => this.setState({ ssid: text })} />
                <TextInput style={styles.input} placeholder="Password" password={true} onChangeText={(text) => this.setState({ password: text })} />
                <Button title="Submit" onPress={this.sendCredentials} />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    info: {
        fontSize: 20,
        marginBottom: 10,
        color: "black"
    },
    input: {
        fontSize: 20,
        marginBottom: 10,
        color: "black"
    }
});
