import { PuppeteerClientOptions } from "xcrap/dist/clients/puppeteer.client"
import BaseClient, { Client } from "xcrap/dist/clients/base.client"
import puppeteer, { PuppeteerExtraPlugin } from "puppeteer-extra"
import { Browser, Page as PuppeteerPage } from "puppeteer"
import PageSet from "xcrap/dist/page-set"
import Page from "xcrap/dist/page"

export type PuppeteerExtraProxy = string

export type PuppeteerExtraClientOptions = Omit<PuppeteerClientOptions & {
    plugins?: PuppeteerExtraPlugin[]
}, "targetFilter">

export type GetMethodOptionActionsPropItem = (page: PuppeteerPage) => any | Promise<any>

export type GetMethodOptions = {
    url: string
    actions?: GetMethodOptionActionsPropItem[]
    javaScriptEnabled?: boolean
}

export type GetAllMethodOptions = GetMethodOptions[]

class PuppeteerExtraClient extends BaseClient<PuppeteerExtraProxy> implements Client {
    public readonly options: PuppeteerExtraClientOptions
    private browser?: Browser

    public constructor(options: PuppeteerExtraClientOptions = {}) {
        super(options)
        this.options = options
        this.browser = undefined

        if (options.plugins) {
            for (const plugin of options.plugins) {
                this.usePlugin(plugin)
            }
        }
    }

    public usePlugin(plugin: PuppeteerExtraPlugin): void {
        puppeteer.use(plugin)
    }

    private async initBrowser(): Promise<void> {
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

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close()
            this.browser = undefined
        }
    }

    public async get(urlOrOptions: string | GetMethodOptions): Promise<Page> {
        let url = typeof urlOrOptions === "string" ? urlOrOptions : urlOrOptions.url

        if (!this.browser) {
            await this.initBrowser()
        }

        const currentCorsProxyUrl = typeof this.corsProxyUrl === "function" ?
            this.corsProxyUrl() :
            this.corsProxyUrl

        const currentUserAgent = typeof this.userAgent === "function" ?
            this.userAgent() :
            this.userAgent

        const page = await this.browser!.newPage()

        if (currentUserAgent) {
            page.setUserAgent(currentUserAgent)
        }

        if (typeof urlOrOptions !== "string" && urlOrOptions.javaScriptEnabled) {
            page.setJavaScriptEnabled(urlOrOptions.javaScriptEnabled ? true : false)
        }

        await page.goto(`${currentCorsProxyUrl ?? ""}${url}`)

        if (typeof urlOrOptions !== "string") {
            const actions = urlOrOptions.actions ?? []

            for (const action of actions) {
                await action(page)
            }
        }

        const content = await page.content()
        await page.close()

        return new Page(content)
    }

    public async getAll(urlsOrOptions: string[] | GetAllMethodOptions): Promise<PageSet> {
        if (!this.browser) {
            await this.initBrowser()
        }

        const pageSet = new PageSet()

        for (const urlOrOption of urlsOrOptions) {
            const page = await this.get(urlOrOption)
            pageSet.push(page)
        }

        return pageSet
    }

    public async close(): Promise<void> {
        if (this.browser) {
            await this.closeBrowser()
        }
    }
}

export default PuppeteerExtraClient