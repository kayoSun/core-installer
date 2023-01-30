import {EventEmitter} from "events";
import {AbortController} from "node-abort-controller";
import axios from 'axios';

class HttpInstaller extends EventEmitter {
    private configs:any;
    private target:any;
    private multiple:boolean;
    private debug:boolean;
    private signals:any={}
    private initial:boolean=false;
    constructor(configs:any, target?:any, multiple = false, debug = false) {
        super();
        this.configs = configs;
        this.target = target != null ? target : this;
        this.multiple = multiple;
        this.debug = debug;
        if (!this.target.HTTP) {
            this.target.HTTP = {}
        }
    }

    log(...data:any) {
        if (this.debug) {
            // @ts-ignore
            console.log(`🐰😁[HTTP]`, `${this.dateTime()}`, ...data)
        }
    }

    dateTime() {
        const date = new Date();
        return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }

    randomInt(maxNum:number) {
        if (maxNum <= 0) {
            return 0;
        }
        const minNum = 0;
        try {
            return parseInt(`${Math.random() * (maxNum - minNum + 1) + minNum}`, 10);
        } catch (e) {
        }
        return 0;
    }

    randomStr(length = 10) {
        let e = '';
        for (let n = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890', o = 0;
             o < length; o++) {
            e += n.charAt(Math.floor(Math.random() * n.length));
        }
        return e;
    }

    async load() {
        this.emit('initial')
        await this.install();
    }

    async install() {
        if (this.multiple) {
            const keys = Object.keys(this.configs);
            for (const key of keys) {
                const config = this.configs[key];
                await this.createClient(config, key);
            }
        } else {
            await this.createClient(this.configs);
        }
        this.initial = true;
        this.emit('ready')

    }

    createClient(options:any, name?:string|null) {
        const _this = this;
        return new Promise(async (resolve, reject) => {
            const id = _this.randomStr();
            const config = {
                baseURL: options.host,
                timeout: 10000,
                headers: options.headers ? options.headers : {'Content-Type': 'application/json'}
            };
            if (!name) {
                name = null;
                _this.log(`create client [default]`);
            } else {
                name = name.toUpperCase();
                _this.log(`create client [${name}]`);
            }
            const client = axios.create(config);
            const post = (path:string, params?:any) => {
                return new Promise((resolve1, reject1) => {
                    if (typeof path !== 'string' || path === '') {
                        reject1(new Error(`No path found or path's type is not string`));
                    }
                    const _cancel_key = params._cancel_key;
                    delete params._cancel_key;
                    const option:any={};
                    if (_cancel_key){
                        const controller = new AbortController()
                        option.signal = controller.signal;
                        _this.signals[_cancel_key]=controller;
                    }

                    client.post(path, params)
                        .then((result) => {
                            resolve1(result.data);
                        })
                        .catch((error) => {
                            reject1(error);
                        });

                });
            }
            const get = (path:string, params?:any) => {
                return new Promise((resolve1, reject1) => {
                    if (typeof path !== 'string' || path === '') {
                        reject1(new Error(`No path found or path's type is not string`));
                    }
                    const query:any = [];
                    for (const paramsKey in params) {
                        query.push(`${paramsKey}=${params[paramsKey]}`);
                    }
                    if (path.indexOf('?') >= 0) {
                        if (path.indexOf('&') >= 0) {
                            path = `${path}&${query.join('&')}`
                        } else {
                            path = `${path}${query.join('&')}`
                        }
                    } else {
                        path = `${path}?${query.join('&')}`
                    }
                    const _cancel_key = params._cancel_key;
                    delete params._cancel_key;
                    const option:any={};
                    if (_cancel_key){
                        const controller = new AbortController()
                        option.signal = controller.signal;
                        _this.signals[_cancel_key]=controller;
                    }
                    client.get(path,option)
                        .then((result) => {
                            resolve1(result.data);
                        })
                        .catch((error) => {
                            reject1(error);
                        })
                });
            }

            const cancel = (_cancel_key:string) => {
                if (_this.signals[_cancel_key]){
                    _this.signals[_cancel_key].abort()
                }
            }
            const getClient=()=>{
                return client;
            }
            if (name) {
                _this.target.HTTP[name] = {
                    cancel, post, get,client:getClient
                };
            } else {
                _this.target.HTTP = {
                    cancel, post, get,client:getClient
                };
            }
            resolve(true);
        })
    }
}
export default HttpInstaller;