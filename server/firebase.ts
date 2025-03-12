import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const serviceAccount = {
  "type": "service_account",
  "project_id": "kidzone-update",
  "private_key_id": "f7c2d28bd2809e04b7106f869da7f6616c713e4a",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDWa/XSPxziEskC\nVJjhe1YejNOjQ5JgwGUlkfI9UqusWivNUJkIsXmTMM27ti4AMlsnm2+mpd0wquJ6\nmZXqd741mvyn+WNYyuSMoe92rDIxFkpydoj9ZC+2iOY2rhIvIWYyaGWKzGTd7xKW\n6qz4RRKs8+HarRH9sAlumTL/rJg6T3sXam2JtNyVezlyiqsCwB+lgtm0NUCtqXLz\n1WS8yFIdjhn1La08yYFhmtNV1x7+3cUobi89U7YGEtTP4u+eEGP3WGT5zMC6Nkfk\nth35whmA9Tf8pZk6nXXJUbb4qVumoPqjnFJj1lUQEQZO4cXWGh3hjqineJ5hrnyW\nS/vdQ33LAgMBAAECggEAai1OrlxDTK15rPZAOBOPexRILoXk45UR4Q9KsVQRH4kN\nPJ+HEDd12M2naqbVU5Kb8dp16MMkaxeLi6MnCdJetYO4TeNf7xWVJBCCGDU/q2/6\n0IBi6HrmZ5CV0wjSh1UWGqr4cUkyP3XFskal/VCS5WLk+ZiPGpzDpukkyFdqkCBo\nZXVDfHoEin/5A7dZiLfnQ9sSXvT0aOgX5l2cEWd/gZZh0HqTNp1k27TjaRTUHdva\nan4fA1ONEFNZ4jZS8u3GJHDUOMp0b4m8VA7Okb6Wt6KaBuEFMMj3QGYAfU96ysZN\n82lSR+XKAeIsGjY5v9KDQs7OC+hF0FFRR4ldeIpbPQKBgQDuW/i5/yb8YEegFjKs\nhozJzgRVC+58H5Wo425tCpUSzqeuVzrZcHOb/57mh3Gl7Bu91s8vz0Nv3pJd7eN9\nPr/hkPYXb6TjV9X7DWM0KjsTLsDmEaVFZXwQz0PBtFxHb5MG2OBjNmXqXrnzjotq\nqeaX0LCny60CfTsEo0J7tM+JzwKBgQDmSnXk/PPXgLWv+reht2djLNc10OM3cYlv\nbhXc6yuJe463o5wAZuWmxXSdDN78L44RsoK9xVQ952mqRIbj5aEg+M9G0Vj9A1m7\n7InvLKU62Tp+0LRqlZl86lSx2H5pnAelzREjz7xP9BY79iVUaG51KY+9PbRM/8+k\n9EI49CJXRQKBgQDDepPiXfmoEoHLLUlDqlj+C8ILyWw9SV3gkxx1uq8FLIvh89Hk\nj0+QyTOU1dGDhL4/k1J5YB5rOXqKI9VkWrjckZjxIXN1qwxnBtSr7FJkafxy8le7\nMP5tfr2Pt43SXBOVEvn7A5rTefpAX0/BGzNsoA6wnd32Y6OqKwYUE/X8iwKBgFSJ\nnQG0geboTsoNJX/uDbvwaAhPaDmgKi2Hoer5QYA0pU1weAIFw+QWtBo68VhuNJ72\ngtwbJjObUcS5ZzMdxqqN67k5fItUwYok6PWt0/HocHrBLpm51SBv/StUKAOozX3l\n65bT2XMYTVkxoL59n57O5P85OYjSl20cZXr20+xpAoGBAMh+iSlUM/fDvCe2Lnux\nxI+4XwPCXby1+RYoeVjIT/G4doxOAaNQpAxbzY8YdaiwR15tBIQRyHJoz/w7vkkz\nlcOygimghK8Dj6oj4cU9RuBcYbCMzkr4MGFcvA4FVcbXFKwVDXnDORFBi5Dpy72G\nZNI86Dhm20W/mXvtPGSQS0U4\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@kidzone-update.iam.gserviceaccount.com",
  "client_id": "115530068062539655184",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40kidzone-update.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const app = initializeApp({
  credential: cert(serviceAccount)
});

const messaging = getMessaging(app);

interface NotificationData {
  title: string;
  body: string;
  roomId?: string;
}

export async function sendNotification(token: string, data: NotificationData) {
  try {
    const message = {
      notification: {
        title: data.title,
        body: data.body,
      },
      data: {
        roomId: data.roomId?.toString() || '',
      },
      token
    };

    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

export { messaging };