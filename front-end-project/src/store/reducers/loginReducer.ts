const defaultState = {
  status: false,
  username: '',
}

const handleLogin = (state, username) => {
  const newState = JSON.parse(JSON.stringify(state)) // 深拷贝
  newState.status = true
  newState.username = username
  return newState
}

const handleLogout = (state) => {
  const newState = JSON.parse(JSON.stringify(state)) // 深拷贝
  newState.status = false
  newState.username = ''
  return newState
}

const loginReducer = {
  state: defaultState,
  reducers: {
    login: (state, username) => handleLogin(state, username),
    logout: (state) => handleLogout(state),
  },
}

export default loginReducer
