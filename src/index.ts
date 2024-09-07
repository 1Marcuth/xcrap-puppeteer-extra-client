import { PuppeteerClientOptions } from "xcrap/dist/clients/puppeteer.client"
import puppeteer,  { PuppeteerExtraPlugin } from "puppeteer-extra"
import { PuppeteerClient } from "xcrap"

export type PuppeteerExtraClientOptions = PuppeteerClientOptions & {
    plugins?: PuppeteerExtraPlugin[]
}

class PuppeteerExtraClient extends PuppeteerClient {
    public constructor(options: PuppeteerExtraClientOptions = {}) {
        super(options)

        if (options.plugins) {
            for (const plugin of options.plugins) {
                this.usePlugin(plugin)
            }
        }
    }

    protected async initBrowser(): Promise<void> {
        const puppeteerArguments: string[] = []

        if (this.proxy) {
            const currentProxy = typeof this.proxy === "function" ?
                this.proxy() :
                this.proxy

            puppeteerArguments.push(`--proxy-server=${currentProxy}`)
        }

        if (this.options.args && this.options.args.length > 0) {
            puppeteerArguments.push(...this.options.args)
        }

        this.browser = await puppeteer.launch({
            ...this.options,
            args: puppeteerArguments,
            headless: this.options.headless ? "shell" : false
        })
    }

    public usePlugin(plugin: PuppeteerExtraPlugin): void {
        puppeteer.use(plugin)
    }
}

export default PuppeteerExtraClient