const i = window.strobe.api.invoke



export const listTracks  = () =>
    i('tracks:list')
export const createTrack = (dict: {name: string}) =>
    i('tracks:create', dict)
export const updateTrack = (id: number, track: TrackUpdateParams) =>
    i('tracks:update', id, track)
export const deleteTrack = (id: number) =>
    i('tracks:destroy', id)
export const selectTrack = (id: number) =>
    i('tracks:select', id)

export const getTrackDmxMidi = (track_id: number) =>
    i('tracks:dmx_midi:get', track_id)

export const updateTrackDmxMidi = (track_id: number, params: DmxMidiUpdateParams) =>
    i('tracks:dmx_midi:update', track_id, params)


export const listDmxButtons = (track_id: number) =>
    i('dmx_buttons:list', track_id)

export const createDmxButton = (params: DmxButtonCreationParams) =>
    i('dmx_buttons:create', params)

export const updateDmxButton = (id: string, params: DmxButtonUpdateParams) =>
    i('dmx_buttons:update', id, params)

export const playDmxButton = (id: string) => 
    i('dmx_buttons:play', id)

export const deleteDmxButton = (id: string) =>
    i('dmx_buttons:destroy', id)

export const uploadTrackAudio = (track_id: number, file: File) =>
    i('tracks:audio:upload', track_id, file)

export const getDmxScene = () =>
    i('dmx_scene:get')

export const updateDmxScene = (dmxScene: DmxScene) =>
    i('dmx_scene:update', dmxScene)

export const listFixtures = () =>
    i('fixtures:list')

export const getShowState = () =>
    i('show:state')

export const newShow = () =>
    i('show:new')

export const openShow = () =>
    i('show:open')

export const openRecentShow = (dir: string) =>
    i('show:open_recent', dir)

export const removeRecentShow = (dir: string) =>
    i('show:remove_recent', dir)

export const saveShow = () =>
    i('show:save')

export const getTrackAudio = (track_id: number) =>
    i('tracks:audio:get', track_id)

