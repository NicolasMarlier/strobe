import '../DesignSystem/DetailsPanel/DetailsPanel.scss'
import './DmxButtonDetails.scss' 

// `className`: the panel's transition when coming back to it (see usePanelTransition)
const DmxButtonDetailsPlaceholder = ({ className = '' }: { className?: string }) => {
    return <div className={`details-panel dmx-button-details placeholder ${className}`}>
        <span>Select a button to edit</span>
    </div>
}
export default DmxButtonDetailsPlaceholder
