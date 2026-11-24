import React from 'react';
import {Composition} from 'remotion';
import {Promo} from './Promo';
export const Root: React.FC = () => <Composition id="QuantDashPromo" component={Promo} width={1080} height={1920} fps={30} durationInFrames={900} defaultProps={{bgm:true}}/>;
