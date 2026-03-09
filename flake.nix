{
  description = "Sauce for Zwift™ — overlay widgets and advanced instrumentation";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # Electron apps are Linux-only in this project
      supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          electron = pkgs.electron;
        in {
          default = pkgs.buildNpmPackage rec {
            pname = "sauce4zwift";
            version = "2.2.0-alpha.0";

            src = ./.;

            # Generate with: nix build 2>&1 | grep 'got:'
            # or: nix run nixpkgs#prefetch-npm-deps -- package-lock.json
            npmDepsHash = "sha256-jja3fjPdMdL4iJpv0XfH7UwIGeBZu2q2H/gb13Qu/f8=";

            makeCacheWritable = true;
            npmFlags = [ "--ignore-scripts" ];

            nativeBuildInputs = with pkgs; [
              makeWrapper
              python3
              pkg-config
              node-gyp
              gnumake
            ];

            buildInputs = with pkgs; [
              libsecret # for keytar
            ];

            env = {
              ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
              npm_config_nodedir = electron.headers;
            };

            postConfigure = ''
              # Remove macOS-only optional dep that can't build on Linux
              rm -rf node_modules/macos-window-control

              # Rebuild native addons against electron headers
              npm rebuild \
                better-sqlite3 \
                keytar \
                xxhash-addon \
                --nodedir=${electron.headers}
            '';

            buildPhase = ''
              runHook preBuild

              # Generate build.json (normally done by tools/bin/buildenv via git)
              cat > build.json <<BUILDEOF
              {"git_commit":"${self.shortRev or self.dirtyShortRev or "unknown"}","sentry_dsn":null,"google_map_tile_key":null}
              BUILDEOF

              # Compile SCSS
              npx sass pages/scss:pages/css

              # Copy vendored deps from node_modules
              make -j$NIX_BUILD_CORES -C pages/deps
              make -j$NIX_BUILD_CORES -C shared/deps

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/sauce4zwift
              cp -r build.json package.json src shared pages images https $out/lib/sauce4zwift/
              cp -r node_modules $out/lib/sauce4zwift/

              # Clean up build artifacts and dev files
              rm -rf $out/lib/sauce4zwift/pages/scss
              rm -rf $out/lib/sauce4zwift/node_modules/.cache

              mkdir -p $out/bin
              makeWrapper ${electron}/bin/electron $out/bin/sauce4zwift \
                --add-flags "$out/lib/sauce4zwift" \
                --set ELECTRON_IS_DEV 0

              # Desktop entry
              mkdir -p $out/share/applications
              cat > $out/share/applications/sauce4zwift.desktop <<DESKEOF
              [Desktop Entry]
              Name=Sauce for Zwift
              Exec=sauce4zwift %U
              Terminal=false
              Type=Application
              Icon=sauce4zwift
              Categories=Game;
              MimeType=x-scheme-handler/sauce4zwift;
              DESKEOF

              # Icon
              mkdir -p $out/share/icons/hicolor/256x256/apps
              cp build/icon.png $out/share/icons/hicolor/256x256/apps/sauce4zwift.png

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Overlay widgets and advanced instrumentation for the serious Zwifter";
              homepage = "https://www.sauce.llc";
              platforms = platforms.linux;
              mainProgram = "sauce4zwift";
            };
          };
        });

      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs
              electron
              gnumake
              python3
              pkg-config
              libsecret
            ];

            env = {
              ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
              npm_config_nodedir = pkgs.electron.headers;
            };

            shellHook = ''
              echo "Sauce for Zwift dev shell"
              echo "  npm install && make"
              echo "  npm start"
            '';
          };
        });
    };
}
