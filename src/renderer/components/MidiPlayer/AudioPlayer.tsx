import { useEffect, useRef, useState } from "react"
import SmallButton from "../DesignSystem/SmallButton/SmallButton"
import { BackToStartIcon, PauseIcon, PlayIcon } from "../DesignSystem/Icons"
import { useDmxButtonsContext } from "../../contexts/DmxButtonsContext"
import { tickToTime, timeToTick } from "./utils"
import { useRealTimeContext } from "../../contexts/RealTimeContext"
import { useDmxMidiContext } from "../../contexts/DmxMidiContext"
import { sendUsageSignal } from "../../ApiClient"
import { isTextField } from "../../useEditMenu"

const AudioPlayer = () => {
    const { track, audioUrl } = useDmxButtonsContext()
    const { midiCurrentTickRef, sendCurrentTickToServer, seek, onSeek, drivenByMidi } = useRealTimeContext()
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
        // Paused before it really started (e.g. MainStage taking over): not an error
        audioRef.current.play().catch(() => { /* interrupted by pause() */ })
        setIsPlaying(true)
        setIsFollowing(true)
        sendUsageSignal('Strobe.playbackStarted')
    }


    const onRewindButton = () => seek(0)

    // The cursor moved by hand (a click in the timeline, the arrows, Back to Start): the audio goes
    // there too, so that playback carries on from it rather than bringing the cursor back
    const trackRef = useRef(track)
    trackRef.current = track
    useEffect(() => onSeek(tick => {
        if (audioRef.current && trackRef.current) {
            audioRef.current.currentTime = Math.max(0, tickToTime(tick, trackRef.current.bpm))
        }
    }), [])

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

    // Playback > Play / Pause and Back to Start: registered once, they call the latest play, pause and rewind.
    // On macOS, a key the page doesn't take goes on to the menu: Space and Return typed in a text field
    // land here too, and are the field's
    const menuActionsRef = useRef({ toggle: () => { /* set below */ }, rewind: () => { /* set below */ } })
    menuActionsRef.current = {
        toggle: () => { if (!drivenByMidi && !isTextField(document.activeElement)) (isPlaying ? pause : play)() },
        rewind: () => { if (!isTextField(document.activeElement)) onRewindButton() },
    }
    useEffect(() => {
        const unsubscribes = [
            window.strobe.api.onMessage('playback:toggle', () => menuActionsRef.current.toggle()),
            window.strobe.api.onMessage('playback:rewind', () => menuActionsRef.current.rewind()),
        ]
        return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    }, [])

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key != ' ' || isTextField(document.activeElement)) return
        // Taken here, so that macOS doesn't pass it on to Playback > Play / Pause, which would toggle again
        e.preventDefault()
        // Holding Space repeats the key: only its first press toggles
        if(!e.repeat) (isPlaying ? pause : play)()
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
            title={drivenTitle ?? (isPlaying ? 'Pause (Space)' : 'Play (Space)')}
            onClick={() => {(isPlaying ? pause : play)() }}
            disabled={drivenByMidi}>
            { isPlaying ? <PauseIcon/> : <PlayIcon/> }
        </SmallButton>
        <SmallButton
            value={false}
            title={drivenTitle ?? 'Back to Start (Return)'}
            onClick={onRewindButton}
            disabled={drivenByMidi}>
            <BackToStartIcon/>
        </SmallButton>
    </>
}

export default AudioPlayer