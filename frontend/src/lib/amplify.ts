import { Amplify } from 'aws-amplify'

if (process.env.NEXT_PUBLIC_USE_FAKE_AUTH !== 'true') {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID!,
      },
    },
  })
}
