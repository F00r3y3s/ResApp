import 'react-native-svg';

declare module 'react-native-svg' {
  interface SvgProps {
    color?: string;
    stroke?: string;
  }
}
