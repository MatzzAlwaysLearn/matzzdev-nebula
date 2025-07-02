import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import fs from 'fs'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pathUser = process.cwd()

const data = {
    command: [],
    hook: [],
    event: [],
    others: [],
    folderPath: () => {
        const pluginPath = path.join(pathUser, 'plugin')
        return pluginPath
    }
}

function validatePlugin(plugin, file) {
    if (!plugin || typeof plugin !== 'object') throw new Error(`Plugin in ${file} must export an object`)
    if (!plugin.type || typeof plugin.type !== 'string') throw new Error(`Plugin in ${file} must have a 'type' property`)
    if (plugin.type === 'hook') {
        if (typeof plugin.execute !== 'function') throw new Error(`Hook plugin in ${file} must have an 'execute' function`)
    } else {
        if (!plugin.name || typeof plugin.name !== 'string') throw new Error(`Plugin in ${file} must have a 'name' property`)
        if (typeof plugin.execute !== 'function') throw new Error(`Plugin in ${file} must have an 'execute' function`)
    }
    if (plugin.dependsOn && !Array.isArray(plugin.dependsOn)) throw new Error(`Plugin in ${file} 'dependsOn' must be an array if present`)
    if (plugin.init && typeof plugin.init !== 'function') throw new Error(`Plugin in ${file} 'init' must be a function if present`)
    if (plugin.destroy && typeof plugin.destroy !== 'function') throw new Error(`Plugin in ${file} 'destroy' must be a function if present`)
}

function resolveDependencies(plugins) {
    const resolved = []
    const seen = new Set()
    function visit(p) {
        if (seen.has(p.name || p.type + Math.random())) return
        if (p.dependsOn) {
            p.dependsOn.forEach(depName => {
                const dep = plugins.find(x => x.name === depName)
                if (!dep) throw new Error(`Dependency "${depName}" not found for plugin "${p.name}"`)
                visit(dep)
            })
        }
        seen.add(p.name || p.type + Math.random())
        resolved.push(p)
    }
    plugins.forEach(visit)
    return resolved
}

function _loadPluginFile() {
    data.command = []
    data.hook = []
    data.event = []
    data.others = []

    const pluginPath = data.folderPath()
    if (!fs.existsSync(pluginPath)) {
        fs.mkdirSync(pluginPath, { recursive: true })
    }

    const files = fs.readdirSync(pluginPath)
    let allPlugins = []
    files.forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(pluginPath, file)
            const plugin = require(filePath)
            const plugins = Array.isArray(plugin) ? plugin : [plugin]
            plugins.forEach(p => {
                validatePlugin(p, file)
                allPlugins.push(p)
            })
        }
    })

    allPlugins = resolveDependencies(allPlugins)

    data.command = []
    data.hook = []
    data.event = []
    data.others = []

    allPlugins.forEach(p => {
        switch (p.type) {
            case 'command':
                data.command.push(p)
                break
            case 'hook':
                data.hook.push(p)
                break
            case 'event':
                data.event.push(p)
                break
            default:
                data.others.push(p)
                break
        }
    })

    allPlugins.forEach(p => {
        if (typeof p.init === 'function' && !p.__inited) {
            p.init()
            p.__inited = true
        }
    })

    return data
}

export function handleExecute(type, name, ...args) {
    const pluginData = _loadPluginFile()
    let list = pluginData[type]
    if (!list) throw new Error(`Unknown plugin type: ${type}`)
    if (type === 'hook') {
        return list.map(p => (typeof p.execute === 'function' ? p.execute(...args) : undefined))
    }
    const handler = list.find(p => p.name === name)
    if (handler && typeof handler.execute === 'function') {
        return handler.execute(...args)
    } else {
        throw new Error(`${type} "${name}" not found`)
    }
}

export function handleExecuteAll(type, ...args) {
    const pluginData = _loadPluginFile()
    let list = pluginData[type]
    if (!list) throw new Error(`Unknown plugin type: ${type}`)
    return list.map(p => (typeof p.execute === 'function' ? p.execute(...args) : undefined))
}

export function handleExecuteFilter(type, predicate, ...args) {
    const pluginData = _loadPluginFile()
    let list = pluginData[type]
    if (!list) throw new Error(`Unknown plugin type: ${type}`)
    return list.filter(predicate).map(p => (typeof p.execute === 'function' ? p.execute(...args) : undefined))
}

export function handleExecuteCommand(command, ...args) {
    return handleExecute('command', command, ...args)
}

export function handleExecuteHook(...args) {
    return handleExecute('hook', null, ...args)
}

export function handleExecuteEvent(name, ...args) {
    return handleExecute('event', name, ...args)
}

const eventListeners = {}

export function onEvent(eventName, listener) {
    if (!eventListeners[eventName]) eventListeners[eventName] = []
    eventListeners[eventName].push(listener)
}

export function emitEvent(eventName, ...args) {
    const pluginData = _loadPluginFile()
    pluginData.event
        .filter(ev => ev.name === eventName)
        .forEach(ev => ev.execute(...args))
    if (eventListeners[eventName]) {
        eventListeners[eventName].forEach(fn => fn(...args))
    }
}

export function getPluginMeta(type, name) {
    const pluginData = _loadPluginFile()
    let list = pluginData[type]
    if (!list) throw new Error(`Unknown plugin type: ${type}`)
    const handler = list.find(p => p.name === name)
    if (!handler) throw new Error(`${type} "${name}" not found`)
    const { execute, init, destroy, ...meta } = handler
    return meta
}

export function destroyAllPlugins() {
    const pluginData = _loadPluginFile()
    Object.values(pluginData).flat().forEach(p => {
        if (typeof p.destroy === 'function') p.destroy()
    })
}