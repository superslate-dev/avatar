import {describe, expect, it} from 'bun:test'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

const cliEntry = resolve(import.meta.dir, '../src/cli.ts')

function runCli(args: string[]): {exitCode: number; stdout: string; stderr: string} {
  const result = Bun.spawnSync(['bun', cliEntry, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  }
}

describe('superslate-avatar CLI', () => {
  it('prints usage help', () => {
    const res = runCli(['help'])
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toContain('superslate-avatar')
    expect(res.stdout).toContain('svg')
    expect(res.stdout).toContain('grid')
  })

  it('generates an SVG file and an HTML grid file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'superslate-avatar-cli-'))
    try {
      const svgOut = join(dir, 'avatar.svg')
      const svgRes = runCli([
        'svg',
        '--shape',
        'ember',
        '--palette',
        'electric-iris',
        '--appearance',
        'dark',
        '--initials',
        'SS',
        '--size',
        '128',
        '--out',
        svgOut,
      ])
      expect(svgRes.exitCode, svgRes.stderr).toBe(0)
      const svg = await readFile(svgOut, 'utf8')
      expect(svg).toContain('width="128" height="128"')
      expect(svg).toContain('>SS</text>')

      const gridOut = join(dir, 'grid.html')
      const gridRes = runCli(['grid', '--appearance', 'dark', '--out', gridOut])
      expect(gridRes.exitCode, gridRes.stderr).toBe(0)
      const html = await readFile(gridOut, 'utf8')
      expect(html).toContain('Superslate Avatar Grid')
      expect(html).toContain('<figure><svg')
    } finally {
      await rm(dir, {recursive: true, force: true})
    }
  })

  it('fails cleanly when --out is missing or command is unknown', () => {
    const missingOut = runCli(['svg'])
    expect(missingOut.exitCode).not.toBe(0)
    expect(missingOut.stderr).toContain('Missing --out')

    const unknown = runCli(['bogus'])
    expect(unknown.exitCode).not.toBe(0)
    expect(unknown.stderr).toContain('Unknown command')
  })
})
