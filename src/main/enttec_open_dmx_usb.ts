/// <reference types="w3c-web-usb" />
import { WebUSB } from 'usb';
import { dmxHexToArrayBuffer, emptyDmxHexString } from './utils';


interface Endpoint {
    direction: 'in' | 'out'
}
const customWebUSB = new WebUSB({
    // Bypass checking for authorised devices
    allowAllDevices: true
});

export class EnttecOpenDMXUSB {
    private static instance: EnttecOpenDMXUSB;

    device: USBDevice | undefined
    endpointNumber: number
    dmxHexString: string
    initSequenceSent: boolean
    updateDispatch: () => void
    
    constructor() {
        this.device = undefined
        this.endpointNumber = 2
        this.dmxHexString = emptyDmxHexString()
        this.initSequenceSent = false
        this.mainLoop()
        this.updateDispatch = () => {}
    }

    static getInstance(): EnttecOpenDMXUSB {
        if (!EnttecOpenDMXUSB.instance) {
            EnttecOpenDMXUSB.instance = new EnttecOpenDMXUSB();
        }
        return EnttecOpenDMXUSB.instance;
    }

    

    state = () => {
        if(this.device === undefined) {
            return "Not connected"
        }
        else if(this.initSequenceSent) {
            return "Connected"
        }
        else if(this.device.configuration) {
            return "Initializing"
        }
        else {
            return "Identified" 
        }
    }

    locate_device = async() => {
        customWebUSB.requestDevice({ filters: [{
            serialNumber: 'BG01THNA',
            
        }]}).then((device) => {
            this.device = device
            this.updateDispatch()
            this.connect()
        }).catch(e => {

        })
    }
    

    setDmxHex = (dmxHexString: string) => {
        this.dmxHexString = dmxHexString
    }

    connect = async () => {
        if(this.device == undefined) {
            return
        }
        console.log("Connecting to Enttec...")
        this.initSequenceSent = false
        this.device.open()
        if (this.device.configuration === null) {
            await this.device.selectConfiguration(1);
        }
        

        await this.device.claimInterface(0);

        //console.log(this.device.configuration)


        const interfaceConfiguration = this.device.configurations[0].interfaces[0].alternate
        const endpointOut = interfaceConfiguration.endpoints.filter((endpoint: Endpoint) => endpoint.direction == 'out')[0]

        if (endpointOut === undefined) {
            throw 'No endpoint OUT found'
        }

        await this.sendInitialSignals()
        console.log("Connected.")
        this.initSequenceSent = true
        this.updateDispatch()
    }

    disconnect = () => {
        if(this.device == undefined) {
            return
        }
        this.device.releaseInterface(0)
        console.log("Closing device...")
        this.device.close()
    }

    mainLoop = () => {
        if(this.device === undefined) {
            this.locate_device()
            setTimeout(() => {
                this.mainLoop()
            }, 500)
        }
        else if(this.initSequenceSent) {
            this.sendValue()
            setTimeout(() => {
                this.mainLoop()
            }, 30)    
        }
        
    }

    sendValue = async() => {
        if(this.device == undefined) {
            return
        }
        try {
            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 4,
                value: 0x5008,
                index: 1,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 4,
                value: 0x1008,
                index: 1,
            })
            
            
            const arrayBuffer = dmxHexToArrayBuffer(this.dmxHexString)
            //console.log(arrayBuffer)
            await this.device.transferOut(
                this.endpointNumber,
                arrayBuffer
            )
        }
        catch(error: any) {
            this.device = undefined
            console.log("Disconnected")
            this.updateDispatch()
        }
        
    }


    sendInitialSignals = async () => {
        if(this.device == undefined) {
            return
        }
        try {
            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 0,
                value: 0x0000,
                index: 1,
            })
            
            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 3,
                value: 0x4138,
                index: 0,
            })

            await this.device.controlTransferIn({
                requestType: 'vendor',
                recipient: 'device',
                request: 10,
                value: 0x0000,
                index: 1,
            }, 1) 

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 0,
                value: 0x0000,
                index: 1,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 4,
                value: 0x1008,
                index: 1,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 2,
                value: 0x0000,
                index: 1,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 3,
                value: 0x000c,
                index: 0,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 0,
                value: 0x0001,
                index: 1,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 0,
                value: 0x0002,
                index: 1,
            })

            await this.device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: 1,
                value: 0x0200,
                index: 0x0001,
            })
        }
        catch(error: any) {
            this.device = undefined
            console.log("Disconnected")
            this.updateDispatch()
        }
    }
}