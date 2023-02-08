import { init } from '@rematch/core'
import loginReducer from './reducers/loginReducer'

const store = init({
  models: {
    loginReducer
  }
})

export default store