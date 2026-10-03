import { useEffect, useRef, useState } from "react"
import SmallButton from "../DesignSystem/SmallButton/SmallButton"
import { BackToStartIcon, PauseIcon, PlayIcon } from "../DesignSystem/Icons"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { tickToTime, timeToTick } from "./utils"
import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { useDmxMidiContext } from "../../contexts/DmxMidiContext"
import { sendUsageSignal } from "../../ApiClient"

const AudioPlayer = () => {
    const { track, audioUrl } = useDmxButtonsContext()
    const { midiCurrentTickRef, sendCurrentTickToServer } = useRealTimeContext()
    const { setIsFollowing } = useDmxMidiContext()
    const [isPlaying, setIsPlaying] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        if (!audioRef.current) return
        audioRef.current.pause()
        setIsPlaying(false)
        if (!audioUrl) audioRef.current.src = ''
    }, [audioUrl])

    const pause = () => {
        if(!audioRef.current) return 
        audioRef.current.pause()
        setIsPlaying(false)
    }

    const play = () => {
        if(!audioRef.current) return

        if(track) {
            audioRef.current.currentTime = tickToTime(midiCurrentTickRef.current, track.bpm)
        }
        audioRef.current.play()
        setIsPlaying(true)
        setIsFollowing(true)
        sendUsageSignal('Strobe.playbackStarted')
    }


    const onRewindButton = () => {
        if(!audioRef.current) return 
        audioRef.current.currentTime = 0
        sendCurrentTickToServer(0)
    }

    useEffect(() => {
        if(isPlaying && track) {
            const audioInterval = setInterval(() => {
                if(audioRef.current) {
                    sendCurrentTickToServer(timeToTick(audioRef.current.currentTime, track.bpm))
                }
            }, 30)
            return () => clearInterval(audioInterval)
        }
    }, [isPlaying])

    const onKeyDown = (e: KeyboardEvent) => {
        // Holding Space repeats the key: only its first press toggles
        if(e.key == ' ' && !e.repeat) (isPlaying ? pause : play)()
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [isPlaying])

    return <>
        <audio
            ref={audioRef}
            src={audioUrl}/>
        <SmallButton
            value={isPlaying}
            onClick={() => {(isPlaying ? pause : play)() }}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            onClick={onRewindButton}
            disabled={isPlaying}>
            <BackToStartIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer