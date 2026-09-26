import './LostConnectionOverlay.scss'

const LostConnectionOverlay = () => {
    return <div className='overlay'>
        <div className='overlay-title'>Connection lost</div>
        <div>Please restart the server</div>
    </div>
}

export default LostConnectionOverlay