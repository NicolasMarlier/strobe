interface Props {
    value: DmxEffectNature
    onChange: (value: DmxEffectNature) => void
}
const DmxEffectNaturePicker = (props: Props) => {
    const {value, onChange} = props

    const DmxEffectNatures = ['Boom', 'Set', 'Run', 'InverseRun', 'Toggle']

    return <select value={value} onChange={(e) => {
        const newNature = (DmxEffectNatures.find(n => n == e.target.value) || 'Set') as DmxEffectNature
        onChange(newNature)
    }}>
        { DmxEffectNatures.map((nature) => (
            <option key={nature}>{ nature }</option>
        ))}
    </select>
}

export default DmxEffectNaturePicker