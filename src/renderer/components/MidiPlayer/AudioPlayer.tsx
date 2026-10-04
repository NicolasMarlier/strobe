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
    const { midiCurrentTickRef, sendCurrentTickToServer, drivenByMidi } = useRealTimeContext()
    const { setIsFollowing } = useDmxMidiContext()
    const [isPlaying, setIsPlaying] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        if (!audioRef.current) return
        audioRef.current.pause()
        setIsPlaying(false)
        if (!audioUrl) audioRef.current.src = ''
    }, [audioUrl])

    // MainStage starts while the app plays: it takes over, the app's own playback stops
    useEffect(() => {
        if (drivenByMidi) pause()
    }, [drivenByMidi])

    const pause = () => {
        if(!audioRef.current) return 
        audioRef.current.pause()
        setIsPlaying(false)
    }

    const play = () => {
        if(!audioRef.current || drivenByMidi) return

        if(track) {
            audioRef.current.currentTime = tickToTime(midiCurrentTickRef.current, track.bpm)
        }
        audioRef.current.play()
        setIsPlaying(true)
        setIsFollowing(true)
        sendUsageSignal('Strobe.playbackStarted')
    }


    const onRewindButton = () => {
        if(!audioRef.current || drivenByMidi) return 
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
    }, [isPlaying, drivenByMidi])

    const drivenTitle = drivenByMidi ? 'Playback is driven by MainStage' : undefined

    return <>
        <audio
            ref={audioRef}
            src={audioUrl}/>
        <SmallButton
            value={isPlaying}
            title={drivenTitle}
            onClick={() => {(isPlaying ? pause : play)() }}
            disabled={drivenByMidi}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            title={drivenTitle}
            onClick={onRewindButton}
            disabled={isPlaying || drivenByMidi}>
            <BackToStartIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer