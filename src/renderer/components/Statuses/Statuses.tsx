import './Statuses.scss'
import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { UsbIcon } from "../DesignSystem/Icons"

const Statuses = () => {
    const { enttecOpenUSBState } = useRealTimeContext()

    const openUsbColor = {
                    'Not connected': 'gray',
                    'Connected': 'green',
                    'Initializing': 'orange',
                    'Identified': 'orange',
                }[enttecOpenUSBState] || 'gray'
    
    return <>
        <div className={`status-icon ${openUsbColor}`}>{ UsbIcon() }</div>
    </>
}
export default Statuses