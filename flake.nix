{
  description = "Flake for basic web dependencies";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs_20
          openssl
          pkg-config
          prisma-engines_7
          python3
        ];

        shellHook = ''
          echo "--- gestion-del-fin dev-shell initialized! ---"
          export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [ pkgs.openssl ]}:$LD_LIBRARY_PATH
          export PATH="${pkgs.openssl}/bin:$PATH"
        '';
      };
    };
}
