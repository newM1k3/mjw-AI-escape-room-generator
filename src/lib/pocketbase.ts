import PocketBase from 'pocketbase';
import { publicConfig } from '../config';

const pb = new PocketBase(publicConfig.pocketBaseUrl || 'http://127.0.0.1:8090');

pb.autoCancellation(false);

export default pb;
