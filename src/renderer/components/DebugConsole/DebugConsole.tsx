import { useState } from 'react'
import { useRealTimeContext } from '../../contexts/RealTimeContext'
import './DebugConsole.scss'
const DebugConsole = () => {

    const { debugIncomingWsPayloads, debugOutgoingWsPayloads } =  useRealTimeContext()


    const incomingChannels = [...new Set(debugIncomingWsPayloads.map(({channel}) => channel))]
    const outgoingChannels = [...new Set(debugOutgoingWsPayloads.map(({channel}) => channel))]

    const incomingChannelStats = Object.fromEntries(Object.entries(Object.groupBy(debugIncomingWsPayloads, ({channel}) => channel)).map(([k, v]) => [k, (v ?? []).length]))
    const outgoingChannelStats = Object.fromEntries(Object.entries(Object.groupBy(debugOutgoingWsPayloads, ({channel}) => channel)).map(([k, v]) => [k, v.length]))

    const [currentFocus, setCurrentFocus] = useState<string | undefined>(undefined)

    return <div className='debug-console'>
        { incomingChannels.map(c =>
            <div>
            <p
                key={c}
                onClick={() => setCurrentFocus(`inc-${c}`)}>
                [INC] {c} ({incomingChannelStats[c]})
            </p>
            { currentFocus == `inc-${c}` && <div className='details'>
                { debugIncomingWsPayloads.filter(p => p.channel = c).map((p, i) => 
                <p key={i}>
                    { JSON.stringify(p) }
                </p>) }
            </div>}
            </div>)
        }
        { outgoingChannels.map(c =>
            <div>
            <p
                key={c}
                onClick={() => setCurrentFocus(`out-${c}`)}>
                [INC] {c} ({outgoingChannelStats[c]})
            </p>
            { currentFocus == `out-${c}` && <div className='details'>
                { debugOutgoingWsPayloads.filter(p => p.channel = c).map((p, i) => 
                <p key={i}>
                    { JSON.stringify(p) }
                </p>) }
            </div>}
            </div>)
        }
    </div>
}


export default DebugConsole